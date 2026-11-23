import assert from "node:assert/strict";
import { test } from "node:test";

import contract from "../fixtures/contract.json" with { type: "json" };
import gravelRequest from "../fixtures/route-request-gravel_biking.json" with { type: "json" };
import mtbRequest from "../fixtures/route-request-mountain_biking.json" with { type: "json" };
import request from "../fixtures/route-request.json" with { type: "json" };
import {
  ACTIVITIES,
  API_ACTIVITIES,
  DISTANCE_LIMITS_M,
  RUN_ACTIVITIES,
  SHAPES,
} from "../src/index.ts";
import { GRAVEL_BIKING, MOUNTAIN_BIKING } from "../src/sports/index.ts";

// Gravel and MTB (TASK-378 part A, ADR-0322), 10–30 km each. An MTB ride is
// drawn by the route engine on its own network, after the hike; a gravel
// ride as a ride on the bike network, after the walk, which is drawn as a
// run (route_engine/walking.py). The API reads the same requests
// (services/api/tests/test_gravel_mtb_api.py).

const REQUESTS = [
  [GRAVEL_BIKING, gravelRequest],
  [MOUNTAIN_BIKING, mtbRequest],
] as const;

test("gravel and MTB are activities of the API, 10 to 30 km", () => {
  assert.equal(GRAVEL_BIKING.activity, "gravel_biking");
  assert.equal(MOUNTAIN_BIKING.activity, "mountain_biking");
  for (const activity of ["gravel_biking", "mountain_biking"] as const) {
    assert.deepEqual([...DISTANCE_LIMITS_M[activity]], [10_000, 30_000]);
    assert.deepEqual(contract.distance_limits_m[activity], [10_000, 30_000]);
    assert.ok((API_ACTIVITIES as readonly string[]).includes(activity));
    assert.ok((RUN_ACTIVITIES as readonly string[]).includes(activity));
  }
  // The limits of a ride.
  assert.deepEqual(DISTANCE_LIMITS_M.gravel_biking, DISTANCE_LIMITS_M.cycling);
});

test("MTB comes after the hike, gravel after the walk", () => {
  assert.equal(ACTIVITIES.indexOf("mountain_biking"), ACTIVITIES.indexOf("hiking") + 1);
  assert.equal(ACTIVITIES.indexOf("gravel_biking"), ACTIVITIES.indexOf("walking") + 1);
  assert.deepEqual(contract.activities, [...ACTIVITIES]);
});

test("the request of a gravel or MTB ride has the fields of a run's", () => {
  for (const [sport, ride] of REQUESTS) {
    assert.deepEqual(Object.keys(ride).sort(), Object.keys(request).sort());
    assert.equal(ride.activity, sport.activity);
    const [lowest, highest] = sport.distanceM;
    assert.ok(lowest <= ride.distance_m && ride.distance_m <= highest);
    assert.ok((SHAPES as readonly string[]).includes(ride.shape));
  }
});
