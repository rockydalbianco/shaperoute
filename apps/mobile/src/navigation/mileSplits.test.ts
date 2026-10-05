import type { LatLon } from "@shaperoute/shared-types";

import { METRES_PER_MILE } from "../units/format";
import { kmTimesMs, splits, unitTimesMs } from "./runMetrics";
import { lastKmS } from "./runStats";
import {
  addFix,
  emptyTrack,
  pauseTrack,
  resumeTrack,
  type Track,
} from "./trackRecorder";

/**
 * The splits of a run a mile long (TASK-182, part C): worked out from the
 * track, which stays in metres. A kilometre long, they are as before.
 */

const START: LatLon = [46.067, 11.1215];
const MILE = METRES_PER_MILE;

/** A track through `steps`: metres north and seconds. The app's own metres:
 * the degrees are found from the distance the track measures. */
function trackOf(steps: [northM: number, seconds: number][]): Track {
  // What the recorder measures for a degree north of START.
  const probe = addFix(
    addFix(emptyTrack(), { point: START, timeMs: 0, accuracyM: 5 }),
    { point: [START[0] + 0.01, START[1]], timeMs: 1000, accuracyM: 5 },
  );
  const degree = 0.01 / probe.distanceM;
  return steps.reduce(
    (track, [northM, seconds]) =>
      addFix(track, {
        point: [START[0] + northM * degree, START[1]],
        timeMs: Math.round(seconds * 1000),
        accuracyM: 5,
      }),
    emptyTrack(),
  );
}

/** A fix every `everyM` to `metres` and one at the end of each mile, each
 * mile in its `mileSeconds`; what is beyond the last mile given goes on at
 * its pace. */
function milesOf(mileSeconds: number[], metres: number, everyM = 50): Track {
  const secondsAt = (m: number) => {
    let seconds = 0;
    let left = m;
    for (let i = 0; left > 0; i += 1) {
      const time = mileSeconds[Math.min(i, mileSeconds.length - 1)];
      seconds += (Math.min(left, MILE) / MILE) * time;
      left -= MILE;
    }
    return seconds;
  };
  const at = new Set<number>([metres]);
  for (let m = 0; m < metres; m += everyM) {
    at.add(m);
  }
  for (let m = MILE; m < metres; m += MILE) {
    at.add(m);
  }
  return trackOf([...at].sort((a, b) => a - b).map((m) => [m, secondsAt(m)]));
}

test("each whole mile has its time, and the change from the one before", () => {
  expect(splits(emptyTrack(), MILE)).toEqual([]);
  // 3.3 miles: the first in 9:00, the second in 8:30, the third in 8:45.
  const rows = splits(milesOf([540, 510, 525], 3.3 * MILE), MILE);
  expect(rows.map((row) => row.km)).toEqual([1, 2, 3]);
  expect(rows[0].seconds).toBeCloseTo(540, 1);
  expect(rows[0].change).toBeNull();
  expect(rows[1].seconds).toBeCloseTo(510, 1);
  expect(rows[1].change).toBeCloseTo(-30, 1);
  expect(rows[2].seconds).toBeCloseTo(525, 1);
  expect(rows[2].change).toBeCloseTo(15, 1);
});

test("a mile ends between two fixes, in proportion", () => {
  // One fix at the start, one at 2,000 m after 800 s: the mile ends at
  // 1,609.344 m, 643.7 s in.
  const track = trackOf([
    [0, 0],
    [2000, 800],
  ]);
  const times = unitTimesMs(track, MILE);
  expect(times).toHaveLength(1);
  expect(times[0] / 1000).toBeCloseTo((MILE / 2000) * 800, 1);
  // The same track has one whole kilometre too, at 400 s.
  expect(kmTimesMs(track)[0] / 1000).toBeCloseTo(400, 1);
});

test("a mile is whole at its last metre, not before", () => {
  // One step, to a metre short of the mile: no mile yet.
  const short = trackOf([
    [0, 0],
    [MILE - 1, 480],
  ]);
  expect(splits(short, MILE)).toEqual([]);
  expect(lastKmS(short, MILE)).toBeNull();
  // One step, to a metre past the mile: one mile, and no more.
  const past = trackOf([
    [0, 0],
    [MILE + 1, 480],
  ]);
  const rows = splits(past, MILE);
  expect(rows).toHaveLength(1);
  expect(rows[0].seconds).toBeCloseTo((MILE / (MILE + 1)) * 480, 1);
  // Two miles less a metre: still one; a metre more: two.
  expect(splits(milesOf([480, 500], 2 * MILE - 1), MILE)).toHaveLength(1);
  expect(splits(milesOf([480, 500], 2 * MILE + 1), MILE)).toHaveLength(2);
  // A kilometre and a half is one kilometre, and no mile.
  const km = trackOf([
    [0, 0],
    [1500, 450],
  ]);
  expect(splits(km)).toHaveLength(1);
  expect(splits(km, MILE)).toEqual([]);
});

test("what is left after the last whole mile is not a split", () => {
  // 2.9 miles: two splits, and 0.9 of a mile that is no row.
  const track = milesOf([540, 510, 400], 2.9 * MILE);
  const rows = splits(track, MILE);
  expect(rows.map((row) => row.km)).toEqual([1, 2]);
  expect(lastKmS(track, MILE)).toBeCloseTo(510, 1);
  // The same run has four whole kilometres (4.67 km).
  expect(splits(track)).toHaveLength(4);
});

test("a pause is in no mile", () => {
  // 1,000 m in 5:00, ten minutes paused, a mile more at the same pace.
  let track = trackOf([
    [0, 0],
    [500, 150],
    [1000, 300],
  ]);
  track = resumeTrack(pauseTrack(track, 300_000), 900_000);
  // Back where the run was paused, then on.
  const after = trackOf([
    [1000, 900],
    [1010, 903],
    [1500, 1050],
    [2000, 1200],
    [2700, 1410],
  ]);
  for (const fix of after.fixes) {
    track = addFix(track, fix);
  }
  const rows = splits(track, MILE);
  expect(rows).toHaveLength(1);
  // A mile at 5:00 a kilometre is about 8:03: the ten minutes are left out,
  // as they are of a kilometre (runMetrics.test.ts).
  expect(rows[0].seconds).toBeGreaterThan(MILE * 0.3 - 5);
  expect(rows[0].seconds).toBeLessThan(MILE * 0.3 + 5);
  expect(lastKmS(track, MILE)).toBe(rows[0].seconds);
  // In kilometres, as before: the pause in neither.
  const km = splits(track);
  expect(km).toHaveLength(2);
  expect(km[0].seconds).toBeCloseTo(300, 0);
  expect(km[1].seconds).toBeGreaterThan(295);
  expect(km[1].seconds).toBeLessThan(305);
});

test("a kilometre long, the splits are the ones of before", () => {
  const track = milesOf([540, 510, 525], 3.3 * MILE);
  expect(unitTimesMs(track, 1000)).toEqual(kmTimesMs(track));
  expect(splits(track, 1000)).toEqual(splits(track));
  expect(lastKmS(track, 1000)).toBe(lastKmS(track));
  expect(splits(track)).toHaveLength(5);
});

test("the last whole mile, in seconds", () => {
  expect(lastKmS(emptyTrack(), MILE)).toBeNull();
  expect(lastKmS(milesOf([540], 0.99 * MILE), MILE)).toBeNull();
  expect(lastKmS(milesOf([540], 1.2 * MILE), MILE)).toBeCloseTo(540, 1);
  expect(lastKmS(milesOf([540, 510, 525], 3.3 * MILE), MILE)).toBeCloseTo(525, 1);
});
