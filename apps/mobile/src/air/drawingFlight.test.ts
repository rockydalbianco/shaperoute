import type { DrawingDetail } from "@shaperoute/shared-types";
import flight from "@shaperoute/shared-types/fixtures/activity-flight.json";
import details from "@shaperoute/shared-types/fixtures/drawing-details.json";

import { activityFlightOf, splitAtAir } from "./flightLegs";

// A race's post opened from the Feed or a profile (TASK-305 part R6e): the
// flights GET /drawings/{id} gives are drawn only when they fit its line.

const POST = details as unknown as DrawingDetail;
const race = (value: unknown) => ({ ...POST, activity: "paragliding", flight: value });

test("a race's post: one flight from the second point to the fourth", () => {
  const found = activityFlightOf(race(flight));
  expect(found?.air).toEqual([{ from: 1, to: 3 }]);
  expect(found?.split.foot.seconds).toBe(540);
  // White on foot before and after, yellow in the air.
  const cut = splitAtAir(POST.track, found?.air ?? []);
  expect(cut.foot).toEqual([POST.track.slice(0, 2), POST.track.slice(3)]);
  expect(cut.air).toEqual([POST.track.slice(1, 4)]);
});

test("a post without flights, or from an API before R6e: nothing", () => {
  expect(activityFlightOf(POST)).toBeNull();
  expect(activityFlightOf(race(undefined))).toBeNull();
  expect(activityFlightOf(race(null))).toBeNull();
});

test("flights past the post's line are not drawn", () => {
  const last = POST.track.length - 1;
  expect(activityFlightOf(race({ ...flight, air: [[1, last + 1]] }))).toBeNull();
  expect(activityFlightOf({ ...race(flight), track: [] })).toBeNull();
});
