/**
 * A run of «My activities» on the water (TASK-251, part B): its facts and
 * its post write a paddler's pace, the time of 500 m. A run, and a run from
 * an API that says no sport, as before.
 */
import activities from "@shaperoute/shared-types/fixtures/activities.json";
import whole from "@shaperoute/shared-types/fixtures/activity.json";

import type { ActivityDetail } from "../api/activities";
import { postOfActivity, resultValue } from "../share/postRun";
import { runFacts } from "./activityText";

jest.mock("expo-file-system");

const [STAR] = activities.activities;

test("the fixtures say the sport, a run's", () => {
  expect(STAR.activity).toBe("running");
  expect(whole.activity).toBe("running");
});

test("on the water the facts have the pace of 500 m", () => {
  // 2.60 km in 29:12: 5:37 each 500 m.
  const paddled = { distance_m: 2600, duration_s: 1752, activity: "paddling" as const };
  expect(runFacts(paddled)).toBe("2.60 km · 29:12 · 5:37 /500 m");
  expect(runFacts({ ...paddled, activity: "running" })).toBe(
    "2.60 km · 29:12 · 11:14 /km",
  );
  expect(runFacts({ ...paddled, activity: "cycling" })).toBe(
    "2.60 km · 29:12 · 11:14 /km",
  );
  // An API before TASK-251 says no sport: a run's pace, as before.
  expect(runFacts({ distance_m: 2600, duration_s: 1752 })).toBe(
    "2.60 km · 29:12 · 11:14 /km",
  );
  expect(runFacts(STAR)).toBe("4.01 km · 19:00 · 4:45 /km");
});

test("the post of an outing of «My activities» has the pace of 500 m", () => {
  const detail = whole as ActivityDetail;
  const paddled: ActivityDetail = {
    ...detail,
    distance_m: 2600,
    duration_s: 1752,
    activity: "paddling",
  };
  expect(resultValue(postOfActivity(paddled), "pace")).toBe("5:37 /500 m");
  expect(resultValue(postOfActivity(detail), "pace")).toBe("4:45 /km");
  const { activity: _sport, ...older } = detail;
  const post = postOfActivity(older);
  expect(post).not.toHaveProperty("activity");
  expect(resultValue(post, "pace")).toBe("4:45 /km");
});
