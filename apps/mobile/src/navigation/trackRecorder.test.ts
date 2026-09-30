import type { LatLon } from "@shaperoute/shared-types";

import { metresBetween } from "../map/coordinates";
import {
  addFix,
  durationMs,
  emptyTrack,
  MAX_ACCURACY_M,
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
