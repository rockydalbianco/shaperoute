/**
 * A run along a turned route is sent with the turn (TASK-232, ADR-0195):
 * the API keeps it, and «My activities» draws the run turned back. Any
 * other run sends what it sent before.
 */
import type { LatLon } from "@shaperoute/shared-types";
import turnedRequest from "@shaperoute/shared-types/fixtures/activity-request-turned.json";
import request from "@shaperoute/shared-types/fixtures/activity-request.json";

import type { SavedRun } from "../navigation/trackStore";
import { activityKey } from "./activityKey";
import { recordedRun } from "./recordedRun";

const ROUTE = request.points as LatLon[];
const FIXES = request.track.map((fix) => ({
  point: fix.point as LatLon,
  timeMs: fix.time_ms,
  accuracyM: fix.accuracy_m,
}));

/** The run of the API's example, along a star turned 30° counterclockwise. */
const RUN: SavedRun = {
  version: 1,
  route: ROUTE,
  similarity: request.similarity,
  rotation_deg: -30,
  track: {
    fixes: FIXES,
    distanceM: 4007,
    pauses: [{ fromMs: 1790000300000, toMs: 1790000360000, auto: true }],
  },
  status: "arrived",
};
const STAR = { shape: "star", word: null, style: null, title: null };

test("a run along a turned route is the API's turned example", () => {
  const recorded = recordedRun(RUN, STAR);
  expect(recorded).toEqual({ id: activityKey(FIXES[0]), request: turnedRequest });
  expect(recorded?.request.rotation_deg).toBe(-30);
});

test("a route north up, or one that does not say, sends the request of before", () => {
  const { rotation_deg: _turn, ...northUp } = RUN;
  expect(recordedRun(northUp, STAR)?.request).toEqual(request);
  expect(recordedRun({ ...RUN, rotation_deg: 0 }, STAR)?.request).toEqual(request);
  expect("rotation_deg" in (recordedRun(northUp, STAR)?.request ?? {})).toBe(false);
});

test("without a route the turn is nobody's: nothing is sent", () => {
  const recorded = recordedRun({ ...RUN, route: [], similarity: undefined }, STAR);
  expect(recorded?.request.points).toBeNull();
  expect("rotation_deg" in (recorded?.request ?? {})).toBe(false);
});
