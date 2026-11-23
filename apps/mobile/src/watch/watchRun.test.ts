import { readFileSync } from "fs";
import path from "path";

import { trackOf, watchRunOf } from "./watchRun";
import { decodeWatchTrack, type WatchTrack } from "./watchTrack";

// The watch's workout as the phone's run (TASK-370 part B3c2).

const TRACKS = JSON.parse(
  readFileSync(
    path.join(
      __dirname,
      "..",
      "..",
      "targets",
      "watch",
      "Core",
      "Fixtures",
      "tracks.json",
    ),
    "utf8",
  ),
) as { valid: { json: unknown }[] };

function fixture(i: number): WatchTrack {
  const read = decodeWatchTrack(TRACKS.valid[i].json);
  if (!read.ok) {
    throw new Error(read.error);
  }
  return read.track;
}

/** A run north, a fix every 20 m and 6 s, with `pauses`. */
function north(count: number, pauses: WatchTrack["pauses"] = []): WatchTrack {
  return {
    activity: "running",
    startedAtMs: 0,
    endedAtMs: count * 6000,
    status: "stopped",
    route: null,
    fixes: Array.from({ length: count }, (_, i) => ({
      point: [46 + (i * 20) / 111_195, 11] as [number, number],
      timeMs: 1000 + i * 6000,
      accuracyM: 5,
      altitudeM: null,
    })),
    pauses,
    distanceM: 0,
    movingMs: 0,
    kcal: null,
    heartAvgBpm: null,
  };
}

test("a run along a route is scored, with its similarity, walks and word", () => {
  const made = watchRunOf(fixture(0));
  expect(made.kind).toBe("route");
  if (made.kind !== "route") {
    return;
  }
  expect(made.run).toMatchObject({
    version: 1,
    similarity: 0.93,
    walks: [[1, 2]],
    word: "IO",
    status: "arrived",
  });
  expect(made.run.route).toHaveLength(4);
  // A run's file says no sport.
  expect(made.run.activity).toBeUndefined();
});

test("a run without a route is a free run", () => {
  const made = watchRunOf(fixture(1));
  expect(made.kind).toBe("free");
  expect(made.run.route).toEqual([]);
  expect(made.run.status).toBe("stopped");
});

test("an unknown similarity scores nothing, another sport says itself", () => {
  const made = watchRunOf({
    ...fixture(2),
    activity: "cycling",
  });
  expect(made.kind === "route" && made.run.similarity).toBe(0);
  expect(made.run.activity).toBe("cycling");
});

test("the line's metres are the phone's, with no metres across a pause", () => {
  const straight = trackOf(north(6));
  expect(straight.fixes).toHaveLength(6);
  expect(straight.distanceM).toBeCloseTo(100, 0);
  // Paused between the third and the fourth fix.
  const paused = trackOf(north(6, [{ fromMs: 14_000, toMs: 18_000 }]));
  expect(paused.pauses).toEqual([{ fromMs: 14_000, toMs: 18_000 }]);
  expect(paused.fixes[3].gap).toBe(true);
  expect(paused.distanceM).toBeCloseTo(80, 0);
});

test("fixes a phone would leave out are left out", () => {
  const track = north(3);
  track.fixes[1] = { ...track.fixes[1], accuracyM: 90 };
  expect(trackOf(track).fixes).toHaveLength(2);
});
