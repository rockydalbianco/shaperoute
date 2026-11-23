import drawingDetails from "@shaperoute/shared-types/fixtures/drawing-details.json";
import runStatsRequest from "@shaperoute/shared-types/fixtures/run-stats-request.json";
import runStats from "@shaperoute/shared-types/fixtures/run-stats.json";
import skiPartsRequest from "@shaperoute/shared-types/fixtures/ski-parts-request.json";
import type { DrawingDetail } from "@shaperoute/shared-types";

import { answers } from "../account/testing";
import { isRunStats, type RunStatsRequest, saveRunStats, statsOf } from "./runStats";

// The figures of a run for the page of its post (TASK-410 part C): the same
// JSON as the API's test_run_stats.py.

const API = "http://api";
const DETAIL = drawingDetails as unknown as DrawingDetail;
const replies = (...list: Parameters<typeof answers>): jest.Mock => answers(...list);

test("the examples are the bodies", () => {
  expect(isRunStats(runStats)).toBe(true);
  // A run with none of them, and an API that leaves a field out.
  expect(isRunStats({})).toBe(true);
  expect(isRunStats({ ...runStats, kcal: "355" })).toBe(false);
  expect(isRunStats({ ...runStats, splits_km: [{ n: 1 }] })).toBe(false);
  expect(isRunStats({ ...runStats, heart: { avg_bpm: 148 } })).toBe(false);
  expect(isRunStats([])).toBe(false);
});

test("a post reads its figures; one without them has none", () => {
  expect(statsOf(DETAIL)).toBeNull();
  expect(statsOf({ ...DETAIL, stats: null } as DrawingDetail)).toBeNull();
  expect(statsOf({ ...DETAIL, stats: runStats } as DrawingDetail)).toEqual({
    ...runStats,
    ski_parts: null,
    ski_descents: null,
    flight_split: null,
  });
  // Hidden by its author: the API sent the rest only.
  const hidden = { ...runStats, kcal: null, heart: null };
  expect(statsOf({ ...DETAIL, stats: hidden } as DrawingDetail)?.heart).toBeNull();
  expect(
    statsOf({ ...DETAIL, stats: { splits_km: runStats.splits_km } } as DrawingDetail),
  ).toEqual({
    splits_km: runStats.splits_km,
    splits_mile: null,
    elevation: null,
    cadence_spm: null,
    kcal: null,
    heart: null,
    ski_parts: null,
    ski_descents: null,
    flight_split: null,
  });
});

test("a day of skiing reads its parts and its descents (TASK-424 part C2b)", () => {
  // As test_ski_parts.py keeps the example: its times from the track's start.
  const parts = skiPartsRequest.ski_parts.map(({ start_ms, end_ms, ...part }) => ({
    ...part,
    start_s: (start_ms - skiPartsRequest.ski_parts[0].start_ms) / 1000,
    end_s: (end_ms - skiPartsRequest.ski_parts[0].start_ms) / 1000,
  }));
  const day = {
    ...runStats,
    ski_parts: parts,
    ski_descents: { metres: 2900, moving_s: 285 },
  };
  expect(isRunStats(day)).toBe(true);
  expect(statsOf({ ...DETAIL, stats: day } as DrawingDetail)?.ski_descents).toEqual({
    metres: 2900,
    moving_s: 285,
  });
  expect(isRunStats({ ...day, ski_parts: [{ ...parts[0], kind: "walk" }] })).toBe(
    false,
  );
  expect(isRunStats({ ...day, ski_descents: { metres: 2900 } })).toBe(false);
  // The request of a day: what TASK-429's app sends, to a server with C2b.
  const request: RunStatsRequest = skiPartsRequest as RunStatsRequest;
  expect(request.ski_parts).toHaveLength(4);
});

test("the phone's figures go to the run's key, with the token", async () => {
  const fetchFn = replies({ status: 200, body: runStats });
  const request = runStatsRequest as RunStatsRequest;
  const outcome = await saveRunStats(API, "tok", "a1b2c3d4e5f60718", request, {
    fetchFn,
  });
  expect(outcome).toEqual({ kind: "ok", value: runStats });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`${API}/me/activities/a1b2c3d4e5f60718/stats`);
  expect(init?.method).toBe("PUT");
  expect(JSON.parse(String(init?.body))).toEqual(request);
  expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer tok");
});

test("a race reads its two kinds; a body that is not one is refused (TASK-305 part R6a)", () => {
  const split = {
    foot: { seconds: 7120, metres: 9800, climb_m: 1240, max_alt_m: 1960 },
    air: { seconds: 6210, metres: 31200, climb_m: 620, max_alt_m: null },
  };
  expect(
    statsOf({ ...DETAIL, stats: { ...runStats, flight_split: split } } as DrawingDetail)
      ?.flight_split,
  ).toEqual(split);
  expect(
    statsOf({
      ...DETAIL,
      stats: { ...runStats, flight_split: { foot: split.foot } },
    } as DrawingDetail),
  ).toBeNull();
});
