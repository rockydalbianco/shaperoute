import type { FeedPost } from "@shaperoute/shared-types";

import { loadSession } from "../account/sessionStore";
import { postMetrics } from "../sports/postMetrics";
import { shownPost } from "./feedPosts";
import runStats from "@shaperoute/shared-types/fixtures/run-stats.json";

import type { RunStats } from "../api/runStats";
import {
  clockLabel,
  elevationSection,
  heartSection,
  MIN_COLUMN,
  type PostSection,
  postSections,
  profileClimbM,
  speedLabel,
  splitsSection,
  summaryRows,
} from "./postSections";

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
  expect(postMetrics("gym")).toEqual({
    distance: false,
    rate: null,
    splits: false,
    elevation: false,
    cadence: false,
  });
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

// --- With the figures of part C (TASK-410 part D) ---

// The example of the API: four kilometres, the last one of 430 m.
const STATS = runStats as RunStats;
const POST = shownPost(DRAWING);

function splitsOf(section: PostSection | null) {
  if (section?.kind !== "splits") {
    throw new Error("no splits");
  }
  return section;
}

test("the table of the splits: a line a kilometre, the fastest, the last part", () => {
  const table = splitsOf(splitsSection(POST, STATS, "km"));
  expect(table.unit).toBe("Km");
  expect(table.rows.map((r) => [r.label, r.pace, r.fastest, r.partial])).toEqual([
    ["1", "5:12 /km", false, false],
    ["2", "5:05 /km", false, false],
    ["3", "4:59 /km", true, false],
    // 140.2 s over 430 m: 5:26 a kilometre, its length in place of its number.
    ["0.43", "5:26 /km", false, true],
  ]);
  // The fastest has the whole bar, the others less as they were slower.
  expect(table.rows[2].share).toBe(1);
  expect(table.rows[0].share).toBeCloseTo(298.7 / 312.4, 5);
  expect(table.fastest).toBe("Fastest: km 3 · 4:59 /km");
});

test("in miles, the miles", () => {
  const table = splitsOf(splitsSection(POST, STATS, "mi"));
  expect(table.unit).toBe("Mile");
  expect(table.rows.map((r) => r.label)).toEqual(["1", "2", "0.13"]);
  expect(table.fastest).toBe("Fastest: mile 1 · 8:18 /mi");
});

test("only a part, no whole kilometre: no fastest", () => {
  const short = { ...STATS, splits_km: [{ n: 1, seconds: 240, partial_m: 800 }] };
  const table = splitsOf(splitsSection(POST, short, "km"));
  expect(table.rows.map((r) => [r.label, r.fastest])).toEqual([["0.80", false]]);
  expect(table.fastest).toBeNull();
});

test("the summary with the figures: fastest km, cadence, the author's calories, climb", () => {
  const found = summaryRows(POST, "km", null, STATS).map(
    (r) => `${r.label}: ${r.value}`,
  );
  expect(found).toEqual([
    "Distance: 5.20 km",
    "Time: 28:10",
    "Avg pace: 5:25 /km",
    "Fastest km: 4:59 /km",
    "Avg cadence: 168 spm",
    "Calories: 355 kcal",
    "Elevation gain: 21 m",
  ]);
  // Hidden by its author, the server sends no calories: the estimate.
  const hidden = summaryRows(POST, "km", null, { ...STATS, kcal: null });
  expect(hidden.find((r) => r.label === "Calories")?.value).toBe("364 kcal");
});

test("the climb of the profile counts rises of 3 m at least", () => {
  const along = (heights: number[]) =>
    heights.map((altitude_m, i) => ({ distance_m: i * 100, altitude_m }));
  expect(profileClimbM(along([194, 201.5, 215, 208, 196.5]))).toBeCloseTo(21, 5);
  // A wander of two metres is no climb.
  expect(profileClimbM(along([100, 102, 100, 102, 100]))).toBe(0);
  expect(profileClimbM(along([100, 104, 101, 106]))).toBe(9);
});

test("the profile: columns from the lowest to the highest, the climb on top", () => {
  const section = elevationSection(POST, STATS, "km");
  if (section?.kind !== "elevation") {
    throw new Error("no profile");
  }
  expect(section.gain).toBe("+21 m");
  expect(section.columns[0]).toBe(MIN_COLUMN);
  expect(section.columns[2]).toBe(1);
  expect(section.columns).toHaveLength(5);
  expect(section.label).toBe("Elevation along the route, from 194 to 215 m");
  const feet = elevationSection(POST, STATS, "mi");
  expect(feet?.kind === "elevation" && feet.gain).toBe("+69 ft");
});

test("the heart rate: average and highest; none when hidden", () => {
  const section = heartSection(STATS);
  expect(section?.kind === "heart" && section.rows).toEqual([
    { label: "Average", value: "148 bpm" },
    { label: "Max", value: "171 bpm" },
  ]);
  expect(heartSection({ ...STATS, heart: null })).toBeNull();
});

test("every card in order; each sport only its own", () => {
  const kinds = (post: typeof POST, stats: RunStats | null) =>
    postSections(post, "km", null, stats).map((section) => section.kind);
  expect(kinds(POST, STATS)).toEqual(["summary", "splits", "elevation", "heart"]);
  // Without figures, as an old post: the summary alone.
  expect(kinds(POST, null)).toEqual(["summary"]);
  // On the water no kilometres and no climb; on the snow no kilometres.
  const paddle = shownPost({ ...DRAWING, activity: "paddling" });
  expect(kinds(paddle, STATS)).toEqual(["summary", "heart"]);
  const ski = shownPost({ ...DRAWING, activity: "skiing" });
  expect(kinds(ski, STATS)).toEqual(["summary", "elevation", "heart"]);
  // On wheels the splits, without the cadence.
  const ride = shownPost({ ...DRAWING, activity: "cycling" });
  expect(kinds(ride, STATS)).toEqual(["summary", "splits", "elevation", "heart"]);
  expect(summaryRows(ride, "km", null, STATS).map((r) => r.label)).not.toContain(
    "Avg cadence",
  );
  // A card with nothing in it is not there.
  const bare = { ...STATS, splits_km: [], elevation: null, heart: null };
  expect(kinds(POST, bare)).toEqual(["summary"]);
});
