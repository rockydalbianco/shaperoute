import { readFileSync } from "fs";
import path from "path";

import { decodeWatchTrack } from "./watchTrack";

// The watch's workout as a file for the phone (TASK-370 part B3c): the
// same fixtures as the watch's XCTest.

type Valid = { name: string; json: Record<string, unknown> };
type Invalid = { name: string; json: unknown; error: string };

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
) as { valid: Valid[]; invalid: Invalid[] };

describe("the watch's track", () => {
  it.each(TRACKS.valid.map((entry) => [entry.name, entry] as const))(
    "is read: %s",
    (_name, entry) => {
      const read = decodeWatchTrack(entry.json);
      if (!read.ok) {
        throw new Error(`refused: ${read.error}`);
      }
      const { json } = entry;
      expect(read.track.activity).toBe(json.activity);
      expect(read.track.fixes).toHaveLength((json.fixes as unknown[]).length);
      expect(read.track.route === null).toBe(json.route === null);
    },
  );

  it.each(TRACKS.invalid.map((entry) => [entry.name, entry] as const))(
    "is refused with the watch's code: %s",
    (_name, entry) => {
      expect(decodeWatchTrack(entry.json)).toEqual({ ok: false, error: entry.error });
    },
  );

  it("keeps every field of a run along a route", () => {
    const read = decodeWatchTrack(TRACKS.valid[0].json);
    expect(read).toEqual({
      ok: true,
      track: {
        activity: "running",
        startedAtMs: 1762358397000,
        endedAtMs: 1762358420000,
        status: "arrived",
        route: {
          key: "a1b2c3",
          title: "Star",
          points: [
            [46.01, 11.29],
            [46.011, 11.29],
            [46.011, 11.291],
            [46.012, 11.291],
          ],
          walks: [[1, 2]],
          word: "IO",
          similarity: 0.93,
        },
        fixes: [
          {
            point: [46.01, 11.29],
            timeMs: 1762358400000,
            accuracyM: 4.5,
            altitudeM: 212.3,
          },
          {
            point: [46.0105, 11.29],
            timeMs: 1762358403000,
            accuracyM: 5,
            altitudeM: null,
          },
          {
            point: [46.011, 11.29],
            timeMs: 1762358406000,
            accuracyM: null,
            altitudeM: null,
          },
        ],
        pauses: [{ fromMs: 1762358407000, toMs: 1762358412000 }],
        distanceM: 111.2,
        movingMs: 18000,
        kcal: 9.5,
        heartAvgBpm: 142,
      },
    });
  });
});
