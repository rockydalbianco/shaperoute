import flight from "@shaperoute/shared-types/fixtures/activity-flight.json";
import activity from "@shaperoute/shared-types/fixtures/activity.json";

import type { ActivityDetail } from "../api/activities";
import { activityFlightOf } from "./flightLegs";

// A race opened again from «My activities» (TASK-305 part R6d): what the
// API gives back is drawn only when it fits the track.

const RUN = activity as unknown as ActivityDetail;
const with_ = (value: unknown) => ({ ...RUN, flight: value }) as ActivityDetail;

test("the example: one flight from the second point to the fourth", () => {
  const race = activityFlightOf(with_(flight));
  expect(race?.air).toEqual([{ from: 1, to: 3 }]);
  expect(race?.split.air.seconds).toBe(600);
});

test("no flight, or one from an API before R6d: nothing", () => {
  expect(activityFlightOf(RUN)).toBeNull();
  expect(activityFlightOf(with_(null))).toBeNull();
});

test("what does not fit the track is not drawn", () => {
  const last = RUN.track.length - 1;
  for (const air of [
    [],
    [[1, last + 1]],
    [[2, 2]],
    [
      [3, 4],
      [1, 2],
    ],
    [[1.5, 3]],
    [[1]],
    "air",
  ]) {
    expect(activityFlightOf(with_({ ...flight, air }))).toBeNull();
  }
  expect(activityFlightOf(with_({ ...flight, split: { foot: 1 } }))).toBeNull();
});
