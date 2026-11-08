import type { FeedPost } from "@shaperoute/shared-types";

import { loadSession } from "../account/sessionStore";
import { postMetrics } from "../sports/postMetrics";
import { shownPost } from "./feedPosts";
import { clockLabel, postSections, speedLabel, summaryRows } from "./postSections";

jest.mock("expo-file-system");
jest.mock("../account/sessionStore", () => ({ loadSession: jest.fn(() => null) }));

const DRAWING: FeedPost = {
  id: "d1",
  title: "Moon over the Adige",
  started_at: "2026-11-04T17:00:00Z",
  published_at: "2026-11-04T18:00:00Z",
  place: "Trento",
  shape: "moon",
  word: null,
  style: null,
  route_title: null,
  distance_m: 5200,
  duration_s: 1690,
  score: null,
  fidelity: null,
  activity: "running",
  track_preview: [],
  author: { public_id: "p1", username: "giulia.runs" },
};

function rows(drawing: Partial<FeedPost>, units: "km" | "mi" = "km") {
  return summaryRows(shownPost({ ...DRAWING, ...drawing }), units).map(
    (row) => `${row.label}: ${row.value}`,
  );
}

beforeEach(() => {
  jest.mocked(loadSession).mockReturnValue(null);
});

test("a watch's time: minutes and seconds, hours when there are", () => {
  expect(clockLabel(1690)).toBe("28:10");
  expect(clockLabel(59)).toBe("0:59");
  expect(clockLabel(3723)).toBe("1:02:03");
  expect(clockLabel(-4)).toBe("0:00");
});

test("a run's summary: distance, time, pace, energy", () => {
  expect(rows({})).toEqual([
    "Distance: 5.20 km",
    "Time: 28:10",
    "Avg pace: 5:25 /km",
    "Calories: 364 kcal",
  ]);
});

test("in miles, the distance and the pace are in miles", () => {
  expect(rows({}, "mi").slice(0, 3)).toEqual([
    "Distance: 3.23 mi",
    "Time: 28:10",
    "Avg pace: 8:43 /mi",
  ]);
});

test("on wheels and on the snow a speed in place of the pace", () => {
  expect(rows({ activity: "cycling", distance_m: 15_000, duration_s: 2700 })).toContain(
    "Avg speed: 20.0 km/h",
  );
  expect(speedLabel(15_000, 2_700_000, "mi")).toBe("12.4 mph");
  expect(postMetrics("inline_skating").rate).toBe("speed");
  expect(postMetrics("skiing").rate).toBe("speed");
  expect(postMetrics("hiking").rate).toBe("pace");
  expect(postMetrics(undefined).rate).toBe("pace");
});

test("on the water the sport's own pace", () => {
  expect(rows({ activity: "paddling", distance_m: 2000, duration_s: 1440 })).toContain(
    "Avg pace: 6:00 /500 m",
  );
});

test("a row without a value is left out, never a dash", () => {
  // Too short for a pace, and no time: no rows for them.
  expect(rows({ distance_m: 50, duration_s: 0 })).toEqual([
    "Distance: 0.05 km",
    "Calories: 4 kcal",
  ]);
});

test("a workout at the gym has no distance nor pace", () => {
  expect(postMetrics("gym")).toEqual({ distance: false, rate: null });
  expect(rows({ activity: "gym", distance_m: 0, duration_s: 3600 })).toEqual([
    "Time: 1:00:00",
  ]);
});

test("an old post has its summary only, and an empty card is not shown", () => {
  const old = shownPost(DRAWING);
  expect(postSections(old, "km").map((section) => section.kind)).toEqual(["summary"]);
  const empty = shownPost({
    ...DRAWING,
    activity: "gym",
    distance_m: 0,
    duration_s: 0,
  });
  expect(postSections(empty, "km")).toEqual([]);
});
