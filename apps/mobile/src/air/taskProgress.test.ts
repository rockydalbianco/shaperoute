import type { LatLon } from "@shaperoute/shared-types";

import type { TrackFix } from "../navigation/trackRecorder";
import type { FlightTask, Turnpoint } from "./flightTask";
import {
  advance,
  edgeM,
  firstToTake,
  gateMs,
  progressOf,
  progressOver,
  resetTaskProgress,
  routeLeft,
  startGateAt,
  startOf,
} from "./taskProgress";
import { destination } from "./taskRoute";

// An invented place and task: no real one anywhere in these tests.
const ORIGIN: LatLon = [46, 11];
const NOON = Date.UTC(2026, 6, 1, 12, 0, 0);

function at(northKm: number, eastKm: number): LatLon {
  return destination(destination(ORIGIN, 0, northKm * 1000), 90, eastKm * 1000);
}

function tp(
  name: string,
  point: LatLon,
  radiusM: number,
  kind: Turnpoint["kind"],
): Turnpoint {
  return {
    waypoint: { name, code: null, point, altM: 500, landing: false, description: null },
    radiusM,
    kind,
  };
}

function taskOf(goal: "cylinder" | "line" = "cylinder"): FlightTask {
  return {
    earth: "wgs84",
    turnpoints: [
      tp("TO", ORIGIN, 400, "takeoff"),
      tp("SS", ORIGIN, 3000, "start"),
      tp("B1", at(10, 0), 1000, "turnpoint"),
      tp("ES", at(10, 10), 1000, "ess"),
      tp("GO", at(0, 10), 400, "goal"),
    ],
    start: { direction: "exit", gates: ["12:00:00Z"], race: true },
    goal: { type: goal, deadline: null },
  };
}

/** Fixes along `points`, one every `stepM` metres, `everyMs` apart from
 * `fromMs`. */
function flyThrough(
  points: LatLon[],
  fromMs: number,
  stepM = 100,
  everyMs = 10_000,
): TrackFix[] {
  const fixes: TrackFix[] = [];
  let timeMs = fromMs;
  for (let i = 0; i + 1 < points.length; i += 1) {
    const [a, b] = [points[i], points[i + 1]];
    const steps = Math.max(
      1,
      Math.round(Math.hypot((b[0] - a[0]) * 111_000, (b[1] - a[1]) * 77_000) / stepM),
    );
    for (let s = 0; s < steps; s += 1) {
      const f = s / steps;
      fixes.push({
        point: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f],
        timeMs,
        accuracyM: 5,
      });
      timeMs += everyMs;
    }
  }
  const end = points[points.length - 1];
  fixes.push({ point: end, timeMs, accuracyM: 5 });
  return fixes;
}

const WAY = [at(0, 0.1), at(0, -5), at(10, 0), at(10, 10), at(0, 10)];

beforeEach(() => resetTaskProgress());

describe("progressOver", () => {
  it("takes the start, the turnpoints and the goal in order", () => {
    const task = taskOf();
    const fixes = flyThrough(WAY, NOON + 60_000);
    const progress = progressOver(task, fixes, fixes[0].timeMs);
    expect(progress.taken.map((one) => one.index)).toEqual([1, 2, 3, 4]);
    expect(progress.next).toBe(5);
    expect(progress.startMs).not.toBeNull();
    // Each later than the one before.
    const times = progress.taken.map((one) => one.atMs);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it("does not take the start before its gate opens", () => {
    const task = taskOf();
    // Out of the start an hour early, then round in circles near it.
    const fixes = flyThrough([at(0, 0.1), at(0, -5)], NOON - 3_600_000);
    const progress = progressOver(task, fixes, fixes[0].timeMs);
    expect(progress.taken).toEqual([]);
    expect(progress.next).toBe(firstToTake(task));
  });

  it("starts again when the start is crossed again before the next turnpoint", () => {
    const task = taskOf();
    const fixes = flyThrough(
      [at(0, 0.1), at(0, -5), at(0, 0), at(0, -5)],
      NOON + 60_000,
    );
    const progress = progressOver(task, fixes, fixes[0].timeMs);
    expect(progress.taken).toHaveLength(1);
    expect(progress.next).toBe(2);
    const firstStart = progressOver(task, fixes.slice(0, 60), fixes[0].timeMs).startMs;
    expect(progress.startMs).toBeGreaterThan(firstStart ?? Infinity);
    expect(progress.taken[0].atMs).toBe(progress.startMs);
  });

  it("never skips a turnpoint", () => {
    const task = taskOf();
    // Out of the start, then straight to the goal past the end of speed.
    const fixes = flyThrough(
      [at(0, 0.1), at(0, -5), at(10, 10), at(0, 10)],
      NOON + 60_000,
    );
    const progress = progressOver(task, fixes, fixes[0].timeMs);
    expect(progress.taken.map((one) => one.index)).toEqual([1]);
    expect(progress.next).toBe(2);
  });

  it("takes a cylinder passed between two fixes", () => {
    const task = taskOf();
    const out = flyThrough([at(0, 0.1), at(0, -5)], NOON + 60_000);
    let progress = progressOver(task, out, out[0].timeMs);
    expect(progress.next).toBe(2);
    // Two fixes 4 km apart, either side of B1's 1 km cylinder.
    const before: TrackFix = {
      point: at(10, -2),
      timeMs: NOON + 7_200_000,
      accuracyM: 5,
    };
    const after: TrackFix = {
      point: at(10, 2),
      timeMs: NOON + 7_260_000,
      accuracyM: 5,
    };
    progress = advance(task, progress, before, after);
    expect(progress.next).toBe(3);
  });

  it("takes nothing before the takeoff", () => {
    const fixes = flyThrough(WAY, NOON + 60_000);
    expect(progressOver(taskOf(), fixes, null)).toEqual(startOf(taskOf()));
  });

  it("takes a goal line only crossing it forwards", () => {
    const task = taskOf("line");
    const toEss = flyThrough(WAY.slice(0, 4), NOON + 60_000);
    let progress = progressOver(task, toEss, toEss[0].timeMs);
    expect(progress.next).toBe(4);
    // Along the line, not across it: not taken.
    const along = advance(
      task,
      progress,
      { point: at(0.5, 9.9), timeMs: NOON + 9_000_000, accuracyM: 5 },
      { point: at(0.5, 10.1), timeMs: NOON + 9_010_000, accuracyM: 5 },
    );
    expect(along.next).toBe(4);
    // Across it, coming from the end of speed: taken.
    progress = advance(
      task,
      progress,
      { point: at(0.1, 10.1), timeMs: NOON + 9_000_000, accuracyM: 5 },
      { point: at(-0.1, 10.1), timeMs: NOON + 9_010_000, accuracyM: 5 },
    );
    expect(progress.next).toBe(5);
  });
});

describe("progressOf", () => {
  it("goes on from its last answer as the track grows, as progressOver", () => {
    const task = taskOf();
    const fixes = flyThrough(WAY, NOON + 60_000);
    const takeoffMs = fixes[0].timeMs;
    for (const end of [10, 200, 500, fixes.length]) {
      expect(progressOf(task, fixes.slice(0, end), takeoffMs)).toEqual(
        progressOver(task, fixes.slice(0, end), takeoffMs),
      );
    }
  });

  it("starts over for another task", () => {
    const fixes = flyThrough(WAY, NOON + 60_000);
    progressOf(taskOf(), fixes, fixes[0].timeMs);
    const other = { ...taskOf(), start: null };
    expect(progressOf(other, fixes, fixes[0].timeMs)).toEqual(
      progressOver(other, fixes, fixes[0].timeMs),
    );
  });
});

describe("the numbers of the task", () => {
  it("reads a gate on the day of a time", () => {
    expect(gateMs("12:00:00Z", NOON + 5_000)).toBe(NOON);
    expect(gateMs("12:30Z", NOON)).toBe(NOON + 1_800_000);
    expect(gateMs("noon", NOON)).toBeNull();
  });

  it("counts down to the first gate, then is open", () => {
    expect(startGateAt(taskOf(), NOON - 90_000)).toEqual({ opensInMs: 90_000 });
    expect(startGateAt(taskOf(), NOON)).toBe("open");
    expect(startGateAt({ ...taskOf(), start: null }, NOON)).toBeNull();
    const noGates = taskOf();
    noGates.start = { direction: "enter", gates: [], race: false };
    expect(startGateAt(noGates, NOON - 90_000)).toBe("open");
  });

  it("measures to the edge of the next cylinder, inside or out", () => {
    const task = taskOf();
    expect(edgeM(task, 2, at(5, 0))).toBeCloseTo(4000, -1);
    expect(edgeM(task, 1, at(0, 1))).toBeCloseTo(2000, -1);
  });

  it("has no way left once the goal is taken", () => {
    const task = taskOf();
    const done = { next: 5, taken: [], startMs: NOON };
    expect(routeLeft(task, done, at(0, 10))).toBeNull();
    const left = routeLeft(task, { next: 4, taken: [], startMs: NOON }, at(5, 10));
    expect(left?.totalM).toBeCloseTo(4600, -1);
  });
});
