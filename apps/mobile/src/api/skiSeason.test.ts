import skiDayParts from "@shaperoute/shared-types/fixtures/ski-day-parts.json";
import skiDay from "@shaperoute/shared-types/fixtures/ski-day.json";
import skiSeason from "@shaperoute/shared-types/fixtures/ski-season.json";
import type { SkiDay } from "@shaperoute/shared-types";

import { answers } from "../account/testing";
import { isSkiDay } from "./skiDays";
import {
  fetchSkiSeason,
  isSkiDayPart,
  isSkiSeason,
  partsOf,
  seasonOf,
} from "./skiSeason";

// A skier's season and the parts of a saved day (TASK-429 part C): the same
// JSON as the API's test_ski_season.py and test_ski_day_parts.py.

const API = "http://api";
const replies = (...list: Parameters<typeof answers>): jest.Mock => answers(...list);

test("the examples are the bodies", () => {
  expect(isSkiSeason(skiSeason)).toBe(true);
  expect(isSkiSeason({ ...skiSeason, top_mps: null })).toBe(true);
  expect(isSkiSeason({ ...skiSeason, days: "6" })).toBe(false);
  for (const part of skiDayParts.parts) {
    expect(isSkiDayPart(part)).toBe(true);
  }
  expect(isSkiDayPart({ ...skiDayParts.parts[0], kind: "jump" })).toBe(false);
});

test("a day with parts is still a day for the app before them", () => {
  // What the app in the shops reads of it: the resort, the gear, the snow.
  expect(isSkiDay(skiDayParts)).toBe(true);
});

test("the parts of a day: the ones that are parts, none without them", () => {
  expect(partsOf(skiDayParts as unknown as SkiDay)).toHaveLength(3);
  expect(partsOf(skiDay as SkiDay)).toEqual([]);
  expect(partsOf(null)).toEqual([]);
  const odd = { ...skiDayParts, parts: [skiDayParts.parts[0], { kind: "jump" }] };
  expect(partsOf(odd as unknown as SkiDay)).toEqual([skiDayParts.parts[0]]);
});

test("a season runs from July to June", () => {
  expect(seasonOf(new Date(2026, 11, 14))).toEqual({
    from: "2026-07-01",
    to: "2027-06-30",
    years: "2026/27",
  });
  expect(seasonOf(new Date(2027, 2, 3))).toEqual({
    from: "2026-07-01",
    to: "2027-06-30",
    years: "2026/27",
  });
  expect(seasonOf(new Date(2027, 6, 1)).years).toBe("2027/28");
});

test("the season is asked between two days, with the token", async () => {
  const fetchFn = replies({ status: 200, body: skiSeason });
  const outcome = await fetchSkiSeason(API, "tok", "2026-07-01", "2027-06-30", {
    fetchFn,
  });
  expect(outcome).toEqual({ kind: "ok", value: skiSeason });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`${API}/me/ski-season?from=2026-07-01&to=2027-06-30`);
  expect(init?.method).toBe("GET");
  expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer tok");
});
