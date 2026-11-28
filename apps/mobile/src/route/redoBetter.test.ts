import type {
  ImageRouteRequest,
  LatLon,
  RouteRequest,
  Walk,
} from "@shaperoute/shared-types";

import { type EndedRun, missedRouteM, REDO_MISSED_M, redoOf } from "./redoBetter";

// «Redo better» (TASK-451, ADR-0419): after a run that left its route, the
// same shape, distance and start for «Draw»; nothing when it did not.

const ORIGIN: LatLon = [46.07, 11.13];
const DEG_LAT = 1 / 111_195.08;
const DEG_LON = DEG_LAT / Math.cos((ORIGIN[0] * Math.PI) / 180);

/** The point x metres east and y metres north of ORIGIN. */
function at(x: number, y: number): LatLon {
  return [ORIGIN[0] + y * DEG_LAT, ORIGIN[1] + x * DEG_LON];
}

/** The corners joined by points every 50 m, as a route has them. */
function line(corners: [number, number][]): LatLon[] {
  const points: LatLon[] = [at(...corners[0])];
  for (let i = 1; i < corners.length; i += 1) {
    const [ax, ay] = corners[i - 1];
    const [bx, by] = corners[i];
    const steps = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 50));
    for (let s = 1; s <= steps; s += 1) {
      points.push(at(ax + ((bx - ax) * s) / steps, ay + ((by - ay) * s) / steps));
    }
  }
  return points;
}

// A square of 1 km a side, round from its start: 4 km, 81 points.
const SQUARE = line([
  [0, 0],
  [1000, 0],
  [1000, 1000],
  [0, 1000],
  [0, 0],
]);

/** The square run 15 m off, the far pavement: still on it. */
const FAITHFUL = line([
  [0, 15],
  [985, 15],
  [985, 985],
  [15, 985],
  [15, 15],
  [0, 15],
]);

/** The square with the first side left between `from` and `to` metres for
 * a street 100 m south, and back. */
function detour(from: number, to: number): LatLon[] {
  return line([
    [0, 0],
    [from, 0],
    [from, -100],
    [to, -100],
    [to, 0],
    [1000, 0],
    [1000, 1000],
    [0, 1000],
    [0, 0],
  ]);
}

const HEART: RouteRequest = {
  start: ORIGIN,
  shape: "heart",
  distance_m: 4000,
  activity: "running",
};
const WORD: RouteRequest = {
  start: ORIGIN,
  word: "CIAO",
  style: "block",
  distance_m: 4000,
  activity: "running",
};

function ended(over: Partial<EndedRun>): EndedRun {
  return {
    request: HEART,
    activity: "running",
    route: SQUARE,
    track: detour(300, 700),
    ...over,
  };
}

describe("missedRouteM", () => {
  test("a run on the route, on the far pavement, misses nothing", () => {
    expect(missedRouteM(SQUARE, FAITHFUL)).toBe(0);
  });

  test("400 m on a street 100 m off miss the 400 m less what is near the turns", () => {
    // Within 40 m of the legs to the parallel street at both ends.
    const missed = missedRouteM(SQUARE, detour(300, 700));
    expect(missed).toBeGreaterThanOrEqual(300);
    expect(missed).toBeLessThanOrEqual(330);
  });

  test("a short detour misses less than the button needs", () => {
    expect(missedRouteM(SQUARE, detour(400, 550))).toBeLessThan(REDO_MISSED_M);
  });

  test("stopping halfway misses nothing, though the square ends at its start", () => {
    const half = line([
      [0, 0],
      [1000, 0],
      [1000, 1000],
    ]);
    expect(missedRouteM(SQUARE, half)).toBe(0);
  });

  test("stopping after a detour counts the detour only", () => {
    const halfAfterDetour = line([
      [0, 0],
      [300, 0],
      [300, -100],
      [700, -100],
      [700, 0],
      [1000, 0],
      [1000, 1000],
    ]);
    expect(missedRouteM(SQUARE, halfAfterDetour)).toBe(
      missedRouteM(SQUARE, detour(300, 700)),
    );
  });

  test("a corner cut across the square misses the sides it cut", () => {
    // The first side, across to the far corner, the last side home.
    const cut = line([
      [0, 0],
      [1000, 0],
      [0, 1000],
      [0, 0],
    ]);
    // Ends at the start: the pass there it could reach is the route's end.
    const missed = missedRouteM(SQUARE, cut);
    expect(missed).toBeGreaterThan(1800);
    expect(missed).toBeLessThan(2000);
  });

  test("a run stopped a few metres after the start misses nothing", () => {
    // The square ends where it starts: its end is near, but out of reach.
    expect(
      missedRouteM(
        SQUARE,
        line([
          [0, 0],
          [30, 0],
        ]),
      ),
    ).toBe(0);
  });

  test("the walks from one letter to the next are left out", () => {
    // Points 6 to 14 of the square: 300 m to 700 m along the first side.
    const walks: Walk[] = [[6, 14]];
    expect(missedRouteM(SQUARE, detour(300, 700), walks)).toBe(0);
  });

  test("a route or a track of nothing misses nothing", () => {
    expect(missedRouteM(SQUARE, [])).toBe(0);
    expect(missedRouteM([ORIGIN], FAITHFUL)).toBe(0);
    expect(missedRouteM([ORIGIN, ORIGIN], FAITHFUL)).toBe(0);
  });

  test("a track of a single fix is the point it is", () => {
    // 500 m along the first side, a fix that never got there: stopped
    // within reach of the start, never a button.
    expect(missedRouteM(SQUARE, [at(500, 0)])).toBeLessThan(REDO_MISSED_M);
    expect(missedRouteM(SQUARE, [at(10, 0)])).toBe(0);
  });
});

describe("redoOf", () => {
  test("a shape run off its route gives the same shape, distance and start", () => {
    expect(redoOf(ended({}))).toEqual({
      again: { kind: "shape", shape: "heart", distance_m: 4000 },
      start: ORIGIN,
    });
  });

  test("a word gives the same word and its style", () => {
    expect(redoOf(ended({ request: WORD }))).toEqual({
      again: { kind: "word", word: "CIAO", style: "block", distance_m: 4000 },
      start: ORIGIN,
    });
  });

  test("a run that kept to its route has no button", () => {
    expect(redoOf(ended({ track: FAITHFUL }))).toBeNull();
    expect(redoOf(ended({ track: detour(400, 550) }))).toBeNull();
  });

  test("on foot, on wheels and on snow it has one; on the water never", () => {
    for (const activity of [
      "walking",
      "hiking",
      "cycling",
      "mountain_biking",
      "gravel_biking",
      "inline_skating",
      "snowshoeing",
      "wheelchair",
    ] as const) {
      expect(redoOf(ended({ activity }))).not.toBeNull();
    }
    expect(redoOf(ended({ activity: "paddling" }))).toBeNull();
    expect(redoOf(ended({ activity: "swimming" }))).toBeNull();
  });

  test("a picture, a word «Draw» refuses or no request has no button", () => {
    const photo: ImageRouteRequest = {
      start: ORIGIN,
      outline: [
        [0, 1],
        [1, 0],
        [0, -1],
        [0, 1],
      ],
      distance_m: 4000,
      activity: "running",
    };
    expect(redoOf(ended({ request: photo }))).toBeNull();
    expect(redoOf(ended({ request: { ...WORD, word: "CIAO MAMMA" } }))).toBeNull();
    expect(redoOf(ended({ request: null }))).toBeNull();
  });
});
