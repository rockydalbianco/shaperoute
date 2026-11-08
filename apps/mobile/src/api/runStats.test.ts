import drawingDetails from "@shaperoute/shared-types/fixtures/drawing-details.json";
import runStatsRequest from "@shaperoute/shared-types/fixtures/run-stats-request.json";
import runStats from "@shaperoute/shared-types/fixtures/run-stats.json";
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
  expect(statsOf({ ...DETAIL, stats: runStats } as DrawingDetail)).toEqual(runStats);
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
  });
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
