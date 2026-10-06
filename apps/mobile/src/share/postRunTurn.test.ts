/**
 * The post of a run keeps how far its route's shape is turned (TASK-232,
 * ADR-0195): from a run of «My activities» and from one that just ended.
 */
import turnedActivity from "@shaperoute/shared-types/fixtures/activity-turned.json";
import activity from "@shaperoute/shared-types/fixtures/activity.json";

import type { ActivityDetail } from "../api/activities";
import type { Track } from "../navigation/trackRecorder";
import { postOfActivity, postOfTrack } from "./postRun";

jest.mock("expo-file-system");

const TRACK: Track = {
  fixes: [
    { point: [46.07, 11.12], timeMs: 0, accuracyM: 5 },
    { point: [46.071, 11.12], timeMs: 60_000, accuracyM: 5 },
  ],
  distanceM: 111,
};

test("a run of «My activities» along a turned route posts it turned back", () => {
  expect(postOfActivity(turnedActivity as unknown as ActivityDetail).rotationDeg).toBe(
    -30,
  );
  // Saved before, or north up: nothing to turn.
  expect("rotationDeg" in postOfActivity(activity as unknown as ActivityDetail)).toBe(
    false,
  );
  for (const turn of [null, 0]) {
    const detail = { ...activity, rotation_deg: turn } as ActivityDetail;
    expect("rotationDeg" in postOfActivity(detail)).toBe(false);
  }
});

test("a run that just ended posts the turn of its route, when it has one", () => {
  expect(postOfTrack(TRACK, undefined, -30).rotationDeg).toBe(-30);
  expect(postOfTrack(TRACK, "cycling", 15)).toMatchObject({
    activity: "cycling",
    rotationDeg: 15,
  });
  expect("rotationDeg" in postOfTrack(TRACK)).toBe(false);
  expect("rotationDeg" in postOfTrack(TRACK, undefined, 0)).toBe(false);
});
