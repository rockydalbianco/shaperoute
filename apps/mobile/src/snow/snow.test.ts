import { ACTIVITIES } from "@shaperoute/shared-types";

import { isOnWater } from "../swim/water";

import { isSnowshoeRoute, isPlacedFree } from "./snow";

test("on the snow: snowshoes only", () => {
  expect(ACTIVITIES.filter((activity) => isSnowshoeRoute(activity))).toEqual([
    "snowshoeing",
  ]);
  expect(isSnowshoeRoute(undefined)).toBe(false);
});

test("placed freely: the water and the snow", () => {
  expect(ACTIVITIES.filter((activity) => isPlacedFree(activity)).sort()).toEqual(
    ["paddling", "snowshoeing", "swimming"].sort(),
  );
});

// Every place that asked isOnWater and now asks isPlacedFree (TASK-413 B)
// answers as before for every activity but snowshoes: paddling and
// swimming stay placed freely, every sport on a network stays on it.
test("for every activity but snowshoes, isPlacedFree says what isOnWater says", () => {
  for (const activity of [...ACTIVITIES, undefined]) {
    if (activity === "snowshoeing") {
      continue;
    }
    expect([activity, isPlacedFree(activity)]).toEqual([activity, isOnWater(activity)]);
  }
  expect(isOnWater("snowshoeing")).toBe(false);
  expect(isPlacedFree("snowshoeing")).toBe(true);
});
