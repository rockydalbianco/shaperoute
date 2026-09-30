import scoreRequest from "@shaperoute/shared-types/fixtures/track-score-request.json";
import scored from "@shaperoute/shared-types/fixtures/track-score.json";
import type {
  LatLon,
  TrackScoreRequest,
  TrackScoreResult,
} from "@shaperoute/shared-types";

import type { ScorableRun } from "../navigation/trackStore";
import { isTrackScore, requestTrackScore, toScoreRequest } from "./trackScores";

const URL = "http://192.168.1.23:8000";
// The fixtures are the contract: they must fit the types as they are.
const REQUEST = scoreRequest as TrackScoreRequest;
const SCORE: TrackScoreResult = scored;

/** The run the app would have recorded to send the contract's request. */
const RUN: ScorableRun = {
  version: 1,
  route: REQUEST.points,
  similarity: REQUEST.similarity,
  status: "arrived",
  track: {
    distanceM: SCORE.distance_m,
    fixes: REQUEST.track.map((fix) => ({
      point: fix.point as LatLon,
      timeMs: fix.time_ms,
      accuracyM: fix.accuracy_m ?? null,
    })),
  },
};

function answering(status: number, body: unknown) {
  return jest.fn(async () => Response.json(body, { status }));
}

test("sends the route, its similarity and the run, and gets the score", async () => {
  const fetchFn = answering(200, scored);
  const outcome = await requestTrackScore(URL, RUN, { fetchFn });
  expect(outcome).toEqual({ kind: "score", score: scored });
  const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe(`${URL}/track-scores`);
  expect(init.method).toBe("POST");
  // The same request as the contract's fixture.
  expect(JSON.parse(init.body as string)).toEqual(scoreRequest);
  expect(toScoreRequest(RUN)).toEqual(scoreRequest);
});

test("a run the engine refuses gives the API's error", async () => {
  const error = {
    error: {
      code: "invalid_request",
      message: "This run cannot be scored: the track is 80 m long.",
      suggested_distance_m: null,
      reason: null,
    },
  };
  const outcome = await requestTrackScore(URL, RUN, {
    fetchFn: answering(422, error),
  });
  expect(outcome).toEqual({ kind: "api_error", ...error.error });
});

test("no API is unreachable, a cancelled request is cancelled", async () => {
  const failing = jest.fn(async () => {
    throw new Error("Network request failed");
  });
  expect(await requestTrackScore(URL, RUN, { fetchFn: failing })).toEqual({
    kind: "unreachable",
    url: URL,
  });
  const stop = new AbortController();
  stop.abort();
  expect(
    await requestTrackScore(URL, RUN, { fetchFn: failing, signal: stop.signal }),
  ).toEqual({ kind: "cancelled" });
});

test("an answer that is not a score is a bad answer", async () => {
  for (const body of [
    { ...scored, score: "91" },
    { ...scored, score: 140 },
    {},
    null,
  ]) {
    expect(
      await requestTrackScore(URL, RUN, { fetchFn: answering(200, body) }),
    ).toEqual({ kind: "bad_answer", status: 200 });
  }
  expect(
    await requestTrackScore(URL, RUN, { fetchFn: answering(500, "oops") }),
  ).toEqual({ kind: "bad_answer", status: 500 });
  expect(isTrackScore(scored)).toBe(true);
});

test("the key goes with the request (TASK-081)", async () => {
  const fetchFn = answering(200, scored);
  await requestTrackScore(URL, RUN, { fetchFn, key: "secret-key-for-tests" });
  const init = (fetchFn.mock.calls[0] as unknown[])[1] as RequestInit;
  expect(new Headers(init.headers).get("X-API-Key")).toBe("secret-key-for-tests");
});
