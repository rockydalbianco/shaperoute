/**
 * Hike & fly (TASK-305 part R6b): one recording divided by itself into its
 * parts on foot and in the air, from the GPS, and corrected by a touch.
 */
import type { Track, TrackFix } from "../navigation/trackRecorder";
import {
  flightParts,
  flightSplit,
  LANDING_WINDOW_MS,
  MIN_PART_MS,
  type PhaseMark,
  phaseNow,
} from "./flightParts";

const START = [45.7355, 10.835] as const;
const T0 = 1_794_470_400_000;
const EARTH_RADIUS_M = 6_371_000;

/** A fix `metres` north of START at `seconds`, `height` above the sea. */
function fix(metres: number, seconds: number, height: number): TrackFix {
  return {
    point: [START[0] + ((metres / EARTH_RADIUS_M) * 180) / Math.PI, START[1]],
    timeMs: T0 + seconds * 1000,
    accuracyM: 5,
    altitudeM: height,
  };
}

type Leg = { seconds: number; mps: number; vario: number };

/** A fix a second along `legs`, each at its speed and climb. */
function trackOf(legs: Leg[], from = 0): Track {
  const fixes: TrackFix[] = [fix(0, 0, 1000)];
  let metres = 0;
  let height = 1000;
  let t = 0;
  for (const leg of legs) {
    for (let s = 0; s < leg.seconds; s += 1) {
      t += 1;
      metres += leg.mps;
      height += leg.vario;
      fixes.push(fix(metres, t + from, height));
    }
  }
  return { fixes, distanceM: metres };
}

// A race: up on foot 40 minutes, a flight of 30 minutes gliding at 10 m/s
// and sinking 1.8 m/s, a walk of 10 minutes after landing.
const UP: Leg = { seconds: 40 * 60, mps: 1.6, vario: 0.25 };
const FLY: Leg = { seconds: 30 * 60, mps: 10, vario: -0.4 };
const SINK: Leg = { seconds: 120, mps: 9, vario: -1.8 };
const WALK: Leg = { seconds: 10 * 60, mps: 1.2, vario: 0 };

test("a race on foot, in the air and on foot again", () => {
  const track = trackOf([UP, SINK, FLY, WALK]);
  const parts = flightParts(track);
  expect(parts.map((part) => part.kind)).toEqual(["foot", "air", "foot"]);
  const [up, air, walk] = parts;
  // The take-off is where the fast stretch began, the landing where the
  // still minute began, within a few seconds of the true moments.
  expect(Math.abs((air.startMs - T0) / 1000 - UP.seconds)).toBeLessThan(10);
  expect(
    Math.abs((walk.startMs - T0) / 1000 - (UP.seconds + SINK.seconds + FLY.seconds)),
  ).toBeLessThan(10);
  expect(up.metres).toBeGreaterThan(3800);
  expect(up.climbM).toBeGreaterThan(550);
  expect(air.metres).toBeGreaterThan(18_000);
  expect(air.maxAltM).toBeGreaterThan(1590);
  expect(parts.every((part) => part.movingMs === part.endMs - part.startMs)).toBe(true);
  const split = flightSplit(parts);
  expect(split?.foot.movingMs).toBe(up.movingMs + walk.movingMs);
  expect(split?.air.metres).toBe(air.metres);
});

test("a flight in thermals, slow over the ground, is in the air from the climb", () => {
  // Circling up at 3 m/s ground speed, 2 m/s up: no speed, all vario.
  const track = trackOf([
    { seconds: 120, mps: 1, vario: 0 },
    { seconds: 600, mps: 3, vario: 2 },
  ]);
  expect(flightParts(track).map((part) => part.kind)).toEqual(["foot", "air"]);
});

test("hanging still into the wind is no landing; a minute stopped on the ground is", () => {
  const hanging = trackOf([SINK, { seconds: 50, mps: 0.5, vario: 0 }, FLY]);
  expect(flightParts(hanging).map((part) => part.kind)).toEqual(["air"]);
  const landed = trackOf([
    SINK,
    FLY,
    { seconds: LANDING_WINDOW_MS / 1000 + 120, mps: 0.5, vario: 0 },
  ]);
  expect(flightParts(landed).map((part) => part.kind)).toEqual(["air", "foot"]);
});

test("a flight alone has no split; nothing to divide without fixes", () => {
  const parts = flightParts(trackOf([SINK, FLY]));
  expect(parts.map((part) => part.kind)).toEqual(["air"]);
  expect(flightSplit(parts)).toBeNull();
  expect(flightParts({ fixes: [], distanceM: 0 })).toEqual([]);
  expect(flightParts(trackOf([UP])).map((part) => part.kind)).toEqual(["foot"]);
});

test("a part shorter than a minute joins its neighbour", () => {
  // A sprint of 30 s at 8 m/s: fast, but too short to be a flight.
  const track = trackOf([UP, { seconds: 30, mps: 8, vario: 0 }, UP]);
  const parts = flightParts(track);
  expect(parts.map((part) => part.kind)).toEqual(["foot"]);
  expect(MIN_PART_MS).toBe(60_000);
});

test("a touch corrects it: the car of the retrieve stays on foot while it drives", () => {
  const car: Leg = { seconds: 15 * 60, mps: 15, vario: 0.5 };
  const track = trackOf([UP, SINK, FLY, WALK, car]);
  const raw = flightParts(track);
  expect(raw.map((part) => part.kind)).toEqual(["foot", "air", "foot", "air"]);
  // The pilot sits in the car and touches «On foot» a minute in.
  const carStarts = (UP.seconds + SINK.seconds + FLY.seconds + WALK.seconds) * 1000;
  const marks: PhaseMark[] = [{ atMs: T0 + carStarts + 60_000, kind: "foot" }];
  const fixed = flightParts(track, marks);
  expect(fixed.map((part) => part.kind)).toEqual(["foot", "air", "foot"]);
});

test("a touch «In the air» at take-off counts at once; what comes after still counts", () => {
  const track = trackOf([UP, SINK, FLY, WALK]);
  const marks: PhaseMark[] = [{ atMs: T0 + (UP.seconds - 90) * 1000, kind: "air" }];
  const parts = flightParts(track, marks);
  expect(parts.map((part) => part.kind)).toEqual(["foot", "air", "foot"]);
  expect(parts[1].startMs).toBe(T0 + (UP.seconds - 90) * 1000);
});

test("the phase now: the last change at once, a touch after the last fix too", () => {
  const climbing = trackOf([UP, { seconds: 25, mps: 9, vario: -1.8 }]);
  expect(phaseNow(climbing)).toBe("air");
  expect(phaseNow(trackOf([UP]))).toBe("foot");
  const last = climbing.fixes[climbing.fixes.length - 1].timeMs;
  expect(phaseNow(climbing, [{ atMs: last + 500, kind: "foot" }])).toBe("foot");
  expect(phaseNow({ fixes: [], distanceM: 0 })).toBe("foot");
});

test("a pause is no time of its part", () => {
  const track = trackOf([UP, SINK, FLY]);
  const pauseFrom = T0 + 600_000;
  track.pauses = [{ fromMs: pauseFrom, toMs: pauseFrom + 120_000 }];
  const [up] = flightParts(track);
  expect(up.movingMs).toBe(up.endMs - up.startMs - 120_000);
});
