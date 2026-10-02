import type { LatLon } from "@shaperoute/shared-types";

import { metresBetween } from "../map/coordinates";
import {
  activeMs,
  addFix,
  continueTrack,
  durationMs,
  emptyTrack,
  MAX_ACCURACY_M,
  openPause,
  pausedMs,
  pauseTrack,
  resumeTrack,
  stepAt,
  type Track,
  type TrackFix,
} from "./trackRecorder";

const START: LatLon = [46.0122, 11.2986];
/** One metre north, in degrees of latitude. */
const METRE = 1 / 111_195;

/** A fix `northM` metres north of START, `seconds` after the start. */
function fix(northM: number, seconds: number, accuracyM: number | null = 5): TrackFix {
  return {
    point: [START[0] + northM * METRE, START[1]],
    timeMs: seconds * 1000,
    accuracyM,
  };
}

function record(fixes: TrackFix[]): Track {
  return fixes.reduce(addFix, emptyTrack());
}

test("fixes in a row make the track, with its length in metres", () => {
  const track = record([fix(0, 0), fix(10, 4), fix(20, 8), fix(30, 12)]);
  expect(track.fixes).toHaveLength(4);
  expect(track.distanceM).toBeCloseTo(30, 0);
  expect(track.distanceM).toBeCloseTo(
    metresBetween(track.fixes[0].point, track.fixes[3].point),
    3,
  );
  expect(durationMs(track)).toBe(12_000);
});

test("a fix too uncertain is dropped, one without accuracy is kept", () => {
  const track = record([
    fix(0, 0),
    fix(10, 4, MAX_ACCURACY_M + 1),
    fix(20, 8, null),
    fix(30, 12, MAX_ACCURACY_M),
  ]);
  expect(track.fixes.map((kept) => kept.timeMs)).toEqual([0, 8000, 12_000]);
  expect(track.distanceM).toBeCloseTo(30, 0);
});

test("a fix less than 5 m from the last one kept is dropped", () => {
  const track = record([fix(0, 0), fix(3, 1), fix(4.5, 2), fix(6, 3), fix(8, 4)]);
  expect(track.fixes.map((kept) => kept.timeMs)).toEqual([0, 3000]);
  expect(track.distanceM).toBeCloseTo(6, 0);
});

test("a fix that is not a position, or from before the last one, is dropped", () => {
  const track = record([fix(0, 10), fix(10, 14)]);
  const notANumber: TrackFix = {
    point: [Number.NaN, START[1]],
    timeMs: 18_000,
    accuracyM: 5,
  };
  expect(addFix(track, notANumber)).toBe(track);
  expect(addFix(track, fix(20, 12))).toBe(track);
});

test("an empty track has no length and no duration", () => {
  expect(emptyTrack()).toEqual({ fixes: [], distanceM: 0 });
  expect(durationMs(emptyTrack())).toBe(0);
  expect(durationMs(record([fix(0, 7)]))).toBe(0);
});

describe("a pause (TASK-169)", () => {
  test("paused by the runner, fixes are not of the run and the clock waits", () => {
    const running = record([fix(0, 0), fix(100, 30)]);
    const paused = pauseTrack(running, 40_000);
    expect(openPause(paused)).toEqual({ fromMs: 40_000, toMs: null });
    // Walking about while paused adds nothing.
    expect(addFix(paused, fix(150, 60))).toBe(paused);
    expect(activeMs(paused, 100_000)).toBe(40_000);
    // Pausing a paused run changes nothing.
    expect(pauseTrack(paused, 50_000)).toBe(paused);
  });

  test("after Resume the first fix is not joined to the last: no metres from the pause", () => {
    const paused = pauseTrack(record([fix(0, 0), fix(100, 30)]), 40_000);
    const resumed = resumeTrack(paused, 100_000);
    expect(openPause(resumed)).toBeNull();
    // 300 m away from where the run was paused.
    const again = record2(resumed, [fix(400, 105), fix(500, 135)]);
    expect(again.fixes[2].gap).toBe(true);
    expect(again.fixes[3].gap).toBeUndefined();
    expect(again.distanceM).toBeCloseTo(200, 0);
    // 135 s on the clock, a minute of them paused.
    expect(durationMs(again)).toBe(75_000);
    expect(pausedMs(again, 0, 135_000)).toBe(60_000);
    // The step over the pause: no metres, and only the time it was not paused.
    expect(stepAt(again, 2)).toEqual({ metres: 0, ms: 15_000 });
    expect(stepAt(again, 3).metres).toBeCloseTo(100, 0);
    expect(stepAt(again, 3).ms).toBe(30_000);
  });

  test("resuming a run that is not paused changes nothing", () => {
    const running = record([fix(0, 0), fix(100, 30)]);
    expect(resumeTrack(running, 40_000)).toBe(running);
  });

  test("a pause never begins before the last fix", () => {
    const paused = pauseTrack(record([fix(0, 0), fix(100, 30)]), 20_000);
    expect(openPause(paused)?.fromMs).toBe(30_000);
  });

  test("a pause before the first fix takes nothing from the clock", () => {
    const waiting = resumeTrack(pauseTrack(emptyTrack(), 1000), 5000);
    const run = record2(waiting, [fix(0, 10), fix(100, 40)]);
    expect(run.fixes[1].gap).toBeUndefined();
    expect(durationMs(run)).toBe(30_000);
  });

  test("a pause by standing still ends with the next fix that moves, and keeps its metres", () => {
    const still = pauseTrack(record([fix(0, 0), fix(100, 30)]), 40_000, true);
    expect(openPause(still)).toEqual({ fromMs: 40_000, toMs: null, auto: true });
    // The GPS wandering by a metre is not moving.
    expect(addFix(still, fix(102, 50))).toBe(still);
    const moving = addFix(still, fix(110, 70));
    expect(openPause(moving)).toBeNull();
    expect(moving.pauses).toEqual([{ fromMs: 40_000, toMs: 70_000, auto: true }]);
    expect(moving.fixes[2].gap).toBeUndefined();
    expect(moving.distanceM).toBeCloseTo(110, 0);
    expect(durationMs(moving)).toBe(40_000);
  });

  test("a track taken up again does not count the time it was left, nor join the line", () => {
    const left = record([fix(0, 0), fix(100, 30)]);
    const again = continueTrack(left, 330_000);
    expect(again.pauses).toEqual([{ fromMs: 30_000, toMs: 330_000 }]);
    const run = record2(again, [fix(900, 335), fix(1000, 365)]);
    expect(run.distanceM).toBeCloseTo(200, 0);
    expect(durationMs(run)).toBe(65_000);
    // Left while paused: the pause goes on to the moment it is taken up.
    const paused = continueTrack(pauseTrack(left, 45_000), 330_000);
    expect(paused.pauses).toEqual([{ fromMs: 45_000, toMs: 330_000 }]);
    expect(continueTrack(emptyTrack(), 5)).toEqual(emptyTrack());
  });
});

function record2(track: Track, fixes: TrackFix[]): Track {
  return fixes.reduce(addFix, track);
}
