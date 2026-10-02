import type { LatLon, Walk } from "@shaperoute/shared-types";
import walkedRequest from "@shaperoute/shared-types/fixtures/activity-request-walks.json";
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

// --- A word with the pen up (TASK-199) ---

/** The run along «II» of the API's example, the pen up between the letters. */
const WALKED: SavedRun = {
  version: 1,
  route: walkedRequest.points as LatLon[],
  similarity: walkedRequest.similarity,
  walks: walkedRequest.walks as Walk[],
  track: {
    fixes: walkedRequest.track.map((fix) => ({
      point: fix.point as LatLon,
      timeMs: fix.time_ms,
      accuracyM: fix.accuracy_m,
    })),
    distanceM: 4003,
    pauses: [{ fromMs: 1790000600000, toMs: 1790000900000, pen: true }],
  },
  status: "arrived",
};
const WORD = { shape: null, word: "II", style: "block" as const, title: null };

test("a run along any other route sends what it sent before, byte for byte", () => {
  // The same text the app sent before TASK-199: an older API refuses any
  // field it does not know.
  const before = JSON.stringify(request);
  expect(JSON.stringify(recordedRun(RUN, STAR)?.request)).toBe(before);
  // No walks in the file, or none: the same.
  expect(JSON.stringify(recordedRun({ ...RUN, walks: [] }, STAR)?.request)).toBe(
    before,
  );
  // A pause of the pen without walks to go with it is the runner's.
  const penned = {
    ...RUN,
    track: {
      ...RUN.track,
      pauses: [{ fromMs: 1790000300000, toMs: 1790000360000, pen: true as const }],
    },
  };
  const sent = recordedRun(penned, STAR)?.request;
  expect(sent?.pauses).toStrictEqual([
    { from_ms: 1790000300000, to_ms: 1790000360000, auto: false },
  ]);
  expect(sent).not.toHaveProperty("walks");
});

test("a run along a word with the pen up sends its walks and the pen", () => {
  const recorded = recordedRun(WALKED, WORD);
  expect(recorded?.id).toBe(activityKey(WALKED.track.fixes[0]));
  // The API's example, field for field and in its order.
  expect(JSON.stringify(recorded?.request)).toBe(JSON.stringify(walkedRequest));
});

test("the pauses of the runner stay the runner's on a word with the pen up", () => {
  const recorded = recordedRun(
    {
      ...WALKED,
      track: {
        ...WALKED.track,
        pauses: [
          { fromMs: 1790000600000, toMs: 1790000900000, pen: true },
          { fromMs: 1790001300000, toMs: 1790001320000 },
          { fromMs: 1790001400000, toMs: 1790001410000, auto: true },
        ],
      },
    },
    WORD,
  );
  expect(recorded?.request.pauses).toStrictEqual([
    { from_ms: 1790000600000, to_ms: 1790000900000, auto: false, pen: true },
    { from_ms: 1790001300000, to_ms: 1790001320000, auto: false },
    { from_ms: 1790001400000, to_ms: 1790001410000, auto: true },
  ]);
});

test("walks that do not fit the route are not sent, nor is the pen", () => {
  for (const walks of [
    [[2, 99]],
    [[5, 2]],
    [
      [2, 5],
      [3, 6],
    ],
  ] as Walk[][]) {
    const sent = recordedRun({ ...WALKED, walks }, WORD)?.request;
    expect(sent).not.toHaveProperty("walks");
    expect(sent?.pauses).toStrictEqual([
      { from_ms: 1790000600000, to_ms: 1790000900000, auto: false },
    ]);
  }
  // Nor without the route they are stretches of.
  const free = recordedRun({ ...WALKED, similarity: undefined }, WORD)?.request;
  expect(free).not.toHaveProperty("walks");
  expect(free?.points).toBeNull();
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
