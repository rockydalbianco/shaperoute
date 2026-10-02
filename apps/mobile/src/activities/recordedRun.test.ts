import type { LatLon } from "@shaperoute/shared-types";
import request from "@shaperoute/shared-types/fixtures/activity-request.json";

import type { SavedRun } from "../navigation/trackStore";
import { activityKey } from "./activityKey";
import { recordedRun, sameLine } from "./recordedRun";

const ROUTE = request.points as LatLon[];
const FIXES = request.track.map((fix) => ({
  point: fix.point as LatLon,
  timeMs: fix.time_ms,
  accuracyM: fix.accuracy_m,
}));

/** The run of the API's example, as the phone has it in its file. */
const RUN: SavedRun = {
  version: 1,
  route: ROUTE,
  similarity: request.similarity,
  track: {
    fixes: FIXES,
    distanceM: 4007,
    pauses: [{ fromMs: 1790000300000, toMs: 1790000360000, auto: true }],
  },
  status: "arrived",
};
const STAR = { shape: "star", word: null, style: null, title: null };

test("a run along a route is the API's example", () => {
  const recorded = recordedRun(RUN, STAR);
  expect(recorded).toEqual({ id: activityKey(FIXES[0]), request });
});

test("a run without a route has neither a route nor what it draws", () => {
  const recorded = recordedRun({ ...RUN, route: [], similarity: undefined }, STAR);
  expect(recorded?.request).toMatchObject({
    points: null,
    similarity: null,
    shape: null,
    word: null,
    style: null,
    title: null,
  });
  expect(recorded?.request.track).toEqual(request.track);
});

test("a route without its similarity is not sent: a file of long ago", () => {
  const recorded = recordedRun({ ...RUN, similarity: undefined }, STAR);
  expect(recorded?.request).toMatchObject({ points: null, similarity: null });
});

test("what the route draws may be unknown", () => {
  expect(recordedRun(RUN, null)?.request).toMatchObject({
    points: ROUTE,
    similarity: request.similarity,
    shape: null,
    word: null,
    style: null,
    title: null,
  });
});

test("the pauses go as they were: the runner's, the app's, never an open one", () => {
  const recorded = recordedRun(
    {
      ...RUN,
      track: {
        ...RUN.track,
        pauses: [
          { fromMs: 1790000100000, toMs: 1790000160000 },
          { fromMs: 1790000300000, toMs: 1790000360000, auto: true },
          { fromMs: 1790001200000, toMs: null },
        ],
      },
    },
    STAR,
  );
  expect(recorded?.request.pauses).toEqual([
    { from_ms: 1790000100000, to_ms: 1790000160000, auto: false },
    { from_ms: 1790000300000, to_ms: 1790000360000, auto: true },
  ]);
});

test("a track of before the pauses has none", () => {
  const { pauses: _, ...track } = RUN.track;
  expect(recordedRun({ ...RUN, track }, STAR)?.request.pauses).toEqual([]);
});

test("less than a line is not a run", () => {
  const track = { ...RUN.track, fixes: FIXES.slice(0, 1) };
  expect(recordedRun({ ...RUN, track }, STAR)).toBeNull();
  expect(recordedRun({ ...RUN, track: { fixes: [], distanceM: 0 } }, null)).toBeNull();
});

test("texts longer than the API takes are cut, and a similarity kept in 0–1", () => {
  const recorded = recordedRun(
    { ...RUN, similarity: 1.0000001 },
    { shape: null, word: "W".repeat(50), style: "block", title: "T".repeat(70) },
  );
  expect(recorded?.request.word).toHaveLength(40);
  expect(recorded?.request.title).toHaveLength(60);
  expect(recorded?.request.style).toBe("block");
  expect(recorded?.request.similarity).toBe(1);
});

test("two lines are the same when their points are", () => {
  expect(
    sameLine(
      ROUTE,
      ROUTE.map(([lat, lon]) => [lat, lon]),
    ),
  ).toBe(true);
  expect(sameLine(ROUTE, ROUTE.slice(1))).toBe(false);
  expect(sameLine(ROUTE, [...ROUTE].reverse())).toBe(false);
  expect(sameLine([], [])).toBe(true);
});
