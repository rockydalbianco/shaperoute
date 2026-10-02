import type { LatLon } from "@shaperoute/shared-types";

import {
  aboutMinutes,
  averagePaceS,
  bearingDeg,
  compassPoint,
  compassWords,
  etaMs,
  headingDeg,
  lastKmS,
  paceClock,
  recentPaceS,
  relativeDeg,
  share,
  toStart,
} from "./runStats";
import { addFix, emptyTrack, type Track } from "./trackRecorder";

const START: LatLon = [46.067, 11.1215];
/** A degree of latitude in metres, as `metresBetween` measures it. */
const METRE = 1 / 111_195;
/** A metre east at this latitude, in degrees of longitude. */
const METRE_EAST = METRE / Math.cos((START[0] * Math.PI) / 180);

function at(northM: number, eastM: number): LatLon {
  return [START[0] + northM * METRE, START[1] + eastM * METRE_EAST];
}

/** A track through `steps`: metres north, metres east, seconds. */
function trackOf(steps: [northM: number, eastM: number, seconds: number][]): Track {
  return steps.reduce(
    (track, [northM, eastM, seconds]) =>
      addFix(track, {
        point: at(northM, eastM),
        timeMs: seconds * 1000,
        accuracyM: 5,
      }),
    emptyTrack(),
  );
}

/** Straight north, a fix every 50 m, at `secondsPerKm`. */
function north(metres: number, secondsPerKm: number): Track {
  const steps: [number, number, number][] = [];
  for (let m = 0; m <= metres; m += 50) {
    steps.push([m, 0, (m / 1000) * secondsPerKm]);
  }
  return trackOf(steps);
}

test("a bearing is degrees clockwise from north", () => {
  expect(bearingDeg(START, at(100, 0))).toBeCloseTo(0, 0);
  expect(bearingDeg(START, at(0, 100))).toBeCloseTo(90, 0);
  expect(bearingDeg(START, at(-100, 0))).toBeCloseTo(180, 0);
  expect(bearingDeg(START, at(0, -100))).toBeCloseTo(270, 0);
  expect(bearingDeg(START, at(100, 100))).toBeCloseTo(45, 0);
});

test("the heading is the way of the last ten metres of the line", () => {
  // North for 40 m, then east.
  const track = trackOf([
    [0, 0, 0],
    [20, 0, 6],
    [40, 0, 12],
    [40, 6, 14],
    [40, 20, 18],
  ]);
  expect(headingDeg(track)).toBeCloseTo(90, 0);
});

test("there is no heading before ten metres of line", () => {
  expect(headingDeg(emptyTrack())).toBeNull();
  expect(headingDeg(trackOf([[0, 0, 0]]))).toBeNull();
  expect(
    headingDeg(
      trackOf([
        [0, 0, 0],
        [6, 0, 2],
      ]),
    ),
  ).toBeNull();
  expect(
    headingDeg(
      trackOf([
        [0, 0, 0],
        [6, 0, 2],
        [12, 0, 4],
      ]),
    ),
  ).toBeCloseTo(0, 0);
});

test("the compass has eight points, in letters and in words", () => {
  expect(compassPoint(0)).toBe("N");
  expect(compassPoint(44)).toBe("NE");
  expect(compassPoint(100)).toBe("E");
  expect(compassPoint(350)).toBe("N");
  expect(compassPoint(-90)).toBe("W");
  expect(compassWords(45)).toBe("north-east");
  expect(compassWords(202)).toBe("south");
  expect(compassWords(225)).toBe("south-west");
});

test("a direction is seen from the heading: ahead, right, behind, left", () => {
  expect(relativeDeg(90, 90)).toBe(0);
  expect(relativeDeg(180, 90)).toBe(90);
  expect(relativeDeg(0, 180)).toBe(180);
  expect(relativeDeg(0, 90)).toBe(270);
});

test("the pace now is that of the last 200 metres, not of the whole run", () => {
  // A kilometre at 6:00 /km, then 300 m at 4:00 /km.
  const steps: [number, number, number][] = [];
  for (let m = 0; m <= 1000; m += 50) {
    steps.push([m, 0, m * 0.36]);
  }
  for (let m = 1050; m <= 1300; m += 50) {
    steps.push([m, 0, 360 + (m - 1000) * 0.24]);
  }
  const track = trackOf(steps);
  const last = track.fixes[track.fixes.length - 1].timeMs;
  expect(recentPaceS(track, last)).toBeCloseTo(240, 0);
  expect(averagePaceS(track, last)).toBeCloseTo(332, 0);
});

test("the pace now needs 100 metres, and slows while the runner stands", () => {
  expect(recentPaceS(emptyTrack(), 0)).toBeNull();
  expect(recentPaceS(north(50, 300), 15_000)).toBeNull();
  const track = north(200, 300);
  expect(recentPaceS(track, 60_000)).toBeCloseTo(300, 0);
  // Twenty seconds with no fix: the same 200 m took 80 s.
  expect(recentPaceS(track, 80_000)).toBeCloseTo(400, 0);
  // Five minutes: slower than a walk, so no pace at all.
  expect(recentPaceS(track, 360_000)).toBeNull();
});

test("the average pace needs 100 metres", () => {
  expect(averagePaceS(north(50, 300), 15_000)).toBeNull();
  expect(averagePaceS(north(1000, 330), 330_000)).toBeCloseTo(330, 0);
});

test("the last kilometre is the one that just ended", () => {
  expect(lastKmS(emptyTrack())).toBeNull();
  expect(lastKmS(north(950, 300))).toBeNull();
  // The first kilometre at 6:00, the second at 5:00, then 300 m more.
  const steps: [number, number, number][] = [];
  for (let m = 0; m <= 1000; m += 50) {
    steps.push([m, 0, m * 0.36]);
  }
  for (let m = 1050; m <= 2300; m += 50) {
    steps.push([m, 0, 360 + (m - 1000) * 0.3]);
  }
  expect(lastKmS(trackOf(steps))).toBeCloseTo(300, 0);
  expect(lastKmS(trackOf(steps.slice(0, 30)))).toBeCloseTo(360, 0);
});

test("a kilometre that ends between two fixes ends in proportion", () => {
  // 0, 900 m at 270 s, 1100 m at 330 s: the kilometre ends at 300 s.
  const track = trackOf([
    [0, 0, 0],
    [900, 0, 270],
    [1100, 0, 330],
  ]);
  expect(lastKmS(track)).toBeCloseTo(300, 0);
});

test("a pace reads as minutes and seconds", () => {
  expect(paceClock(342)).toBe("5:42");
  expect(paceClock(300)).toBe("5:00");
  expect(paceClock(599.6)).toBe("10:00");
});

test("the time left is what remains at the average pace", () => {
  const track = north(1000, 300);
  expect(etaMs(3000, track, 300_000)).toBeCloseTo(900_000, -2);
  expect(etaMs(3000, north(50, 300), 15_000)).toBeNull();
  expect(aboutMinutes(900_000)).toBe("about 15 min");
  expect(aboutMinutes(20_000)).toBe("about 1 min");
  expect(aboutMinutes(65 * 60_000)).toBe("about 1 h 5 min");
});

test("the start is so far, and that way, in a straight line", () => {
  expect(toStart(emptyTrack())).toBeNull();
  // North 300 m, then east 400 m: the start is 500 m away, to the south-west.
  const track = trackOf([
    [0, 0, 0],
    [300, 0, 90],
    [300, 400, 210],
  ]);
  const start = toStart(track);
  expect(start?.distanceM).toBeCloseTo(500, 0);
  expect(start?.bearing).toBeCloseTo(233, 0);
  expect(compassWords(start?.bearing ?? 0)).toBe("south-west");
});

test("a share stays between nothing and all", () => {
  expect(share(420, 1000)).toBeCloseTo(0.42);
  expect(share(1200, 1000)).toBe(1);
  expect(share(-5, 1000)).toBe(0);
  expect(share(10, 0)).toBe(0);
});
