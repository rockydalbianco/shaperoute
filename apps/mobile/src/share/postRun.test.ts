import type { LatLon } from "@shaperoute/shared-types";

import type { ActivityDetail } from "../api/activities";
import { saveLanguageChoice } from "../i18n/language";
import { metresBetween } from "../map/coordinates";
import type { Track } from "../navigation/trackRecorder";
import {
  POST_CUT_M,
  postCaption,
  postOfActivity,
  postOfTrack,
  type PostRun,
  resultsOf,
  resultValue,
  withoutEnds,
} from "./postRun";

jest.mock("expo-file-system");

afterEach(() => saveLanguageChoice("phone"));

/** A straight line north from Trento, a point every `step` metres. */
function north(metres: number, step = 50): LatLon[] {
  const degree = 111_195; // metres in a degree of latitude
  return Array.from({ length: Math.round(metres / step) + 1 }, (_, i): LatLon => [
    46.07 + (i * step) / degree,
    11.12,
  ]);
}

function length(line: LatLon[]): number {
  return line
    .slice(1)
    .reduce((sum, point, i) => sum + metresBetween(line[i], point), 0);
}

const RUN: PostRun = {
  key: "run-1",
  title: "Heart in Trento",
  track: north(5200),
  distanceM: 5200,
  durationMs: (28 * 60 + 10) * 1000,
  score: 87,
};

describe("the results of a post", () => {
  it("are distance, time, pace and score, as runners read them", () => {
    expect(resultsOf(RUN)).toEqual(["distance", "time", "pace", "score"]);
    expect(resultValue(RUN, "distance")).toBe("5.20 km");
    expect(resultValue(RUN, "time")).toBe("28:10");
    expect(resultValue(RUN, "pace")).toBe("5:25 /km");
    expect(resultValue(RUN, "score")).toBe("87");
  });

  it("leave out a score the run does not have, and a pace too short to read", () => {
    expect(resultsOf({ ...RUN, score: null })).toEqual(["distance", "time", "pace"]);
    expect(resultsOf({ ...RUN, score: null, distanceM: 60 })).toEqual([
      "distance",
      "time",
    ]);
  });
});

describe("the text that goes to Strava", () => {
  it("has the emoji, then the results shown, in the post's order", () => {
    expect(postCaption(RUN, ["score", "distance", "time", "pace"], ["🔥", "❤️"])).toBe(
      "🔥❤️ 5.20 km · 28:10 · 5:25 /km · Score 87",
    );
    expect(postCaption(RUN, ["score"], [])).toBe("Score 87");
    expect(postCaption(RUN, [], ["🎉"])).toBe("🎉");
  });

  it("is nothing when the post says nothing", () => {
    expect(postCaption(RUN, [], [])).toBeNull();
    expect(postCaption({ ...RUN, score: null }, ["score"], [])).toBeNull();
  });

  it("is in the app's language", () => {
    saveLanguageChoice("it");
    expect(postCaption(RUN, ["distance", "score"], [])).toBe("5.20 km · Punteggio 87");
  });
});

describe("the ends of the track", () => {
  it("lose their first and last 200 m along the track", () => {
    const track = north(1000);
    const kept = withoutEnds(track);
    expect(POST_CUT_M).toBe(200);
    expect(metresBetween(track[0], kept[0])).toBeCloseTo(200, 0);
    expect(metresBetween(kept[kept.length - 1], track[track.length - 1])).toBeCloseTo(
      200,
      0,
    );
    expect(length(kept)).toBeCloseTo(600, 0);
  });

  it("are cut between two fixes when no fix falls at 200 m", () => {
    const kept = withoutEnds(north(1000, 300));
    expect(length(kept)).toBeCloseTo(500, 0);
  });

  it("leave nothing of a run shorter than both ends together", () => {
    expect(withoutEnds(north(390))).toEqual([]);
    expect(withoutEnds([])).toEqual([]);
  });
});

describe("a post made of", () => {
  it("a run of «My activities» has its key, title and numbers", () => {
    const activity = {
      id: "abc",
      started_at: "2026-10-04T08:00:00Z",
      place: "Trento",
      shape: "heart",
      word: null,
      style: null,
      title: null,
      distance_m: 5200,
      duration_s: 1690,
      score: 87,
      fidelity: null,
      similarity: 0.9,
      points: north(5000),
      track: north(5200),
    } as ActivityDetail;
    const post = postOfActivity(activity);
    expect(post).toMatchObject({
      key: "abc",
      distanceM: 5200,
      durationMs: 1_690_000,
      score: 87,
    });
    expect(post.title).toBe("Trento · Heart");
    expect(postOfActivity({ ...activity, title: "Morning" }).title).toBe("Morning");
  });

  it("a run that just ended has no key nor title, and its pauses left out", () => {
    const points = north(400, 100);
    const track: Track = {
      fixes: points.map((point, i) => ({ point, timeMs: i * 30_000, accuracyM: 5 })),
      distanceM: 400,
      pauses: [{ fromMs: 30_000, toMs: 60_000 }],
    };
    const post = postOfTrack(track, null);
    expect(post).toEqual({
      key: null,
      title: null,
      track: points,
      distanceM: 400,
      durationMs: 90_000,
      score: null,
    });
  });
});
