import strokeRequest from "@shaperoute/shared-types/fixtures/stroke-match-request.json";
import answered from "@shaperoute/shared-types/fixtures/stroke-match.json";
import type { StrokeMatchRequest, StrokeMatchResult } from "@shaperoute/shared-types";

import { PHONE_HEADER } from "../engine/prefetch";
import {
  forgetStrokeMatchProbes,
  isStrokeMatch,
  requestStrokeMatch,
  strokeMatchesOnServer,
} from "./strokeMatches";

jest.mock("expo-file-system", () => jest.requireActual("../engine/memoryFiles"));

const URL = "http://192.168.1.23:8000";
// The fixtures are the contract: they must fit the types as they are.
const REQUEST = strokeRequest as StrokeMatchRequest;
const MATCH = answered as StrokeMatchResult;

function answering(status: number, body?: unknown) {
  return jest.fn(async () =>
    body === undefined
      ? new Response(null, { status })
      : Response.json(body, { status }),
  );
}

beforeEach(() => {
  forgetStrokeMatchProbes();
});

test("the fixture's answer is a match, with a distance for each point sent", () => {
  expect(isStrokeMatch(MATCH, REQUEST.line.length)).toBe(true);
  expect(isStrokeMatch(MATCH, REQUEST.line.length + 1)).toBe(false);
});

test.each([
  ["no points", { ...MATCH, points: [] }],
  ["a point that is not a pair", { ...MATCH, points: [[46.07]] }],
  ["a negative distance", { ...MATCH, away_m: [-1, 2, 3, 4] }],
  ["no off_roads", { points: MATCH.points, away_m: MATCH.away_m }],
  ["not an object", "match"],
])("%s is not a match", (_, body) => {
  expect(isStrokeMatch(body)).toBe(false);
});

test("sends the stroke with the key and the phone's id, and gets the match", async () => {
  const fetchFn = answering(200, answered);

  const outcome = await requestStrokeMatch(URL, REQUEST, {
    fetchFn,
    key: "test-key",
    phone: "0123456789abcdef0123456789abcdef",
  });

  expect(outcome).toEqual({ kind: "match", match: MATCH });
  expect(fetchFn).toHaveBeenCalledWith(`${URL}/stroke-matches`, {
    method: "POST",
    headers: expect.objectContaining({
      "Content-Type": "application/json",
      "X-API-Key": "test-key",
      [PHONE_HEADER]: "0123456789abcdef0123456789abcdef",
    }),
    body: JSON.stringify(REQUEST),
    signal: undefined,
  });
});

test("an error of the API comes back with its code", async () => {
  const fetchFn = answering(422, {
    error: {
      code: "shape_not_drawable",
      message: "the stroke collapses onto a single road node",
      suggested_distance_m: null,
    },
  });

  await expect(
    requestStrokeMatch(URL, REQUEST, { fetchFn, key: null }),
  ).resolves.toEqual({
    kind: "api_error",
    code: "shape_not_drawable",
    message: "the stroke collapses onto a single road node",
    suggested_distance_m: null,
  });
});

test("an older API's 404, or a body that is not a match, is a bad answer", async () => {
  await expect(
    requestStrokeMatch(URL, REQUEST, {
      fetchFn: answering(404, { detail: "Not Found" }),
    }),
  ).resolves.toEqual({ kind: "bad_answer", status: 404 });
  await expect(
    requestStrokeMatch(URL, REQUEST, { fetchFn: answering(200, { points: [] }) }),
  ).resolves.toEqual({ kind: "bad_answer", status: 200 });
});

test("no signal is unreachable, and a stroke no longer wanted is cancelled", async () => {
  const fetchFn = jest.fn(async () => {
    throw new TypeError("Network request failed");
  });
  await expect(requestStrokeMatch(URL, REQUEST, { fetchFn })).resolves.toEqual({
    kind: "unreachable",
    url: URL,
  });

  const stop = new AbortController();
  stop.abort();
  await expect(
    requestStrokeMatch(URL, REQUEST, { fetchFn, signal: stop.signal }),
  ).resolves.toEqual({ kind: "cancelled" });
});

test("the probe's 204 and 404 are kept for the server, and asked once", async () => {
  const yes = answering(204);
  expect(await strokeMatchesOnServer(URL, { fetchFn: yes, key: "test-key" })).toBe(
    true,
  );
  expect(await strokeMatchesOnServer(URL, { fetchFn: yes })).toBe(true);
  expect(yes).toHaveBeenCalledTimes(1);
  expect(yes).toHaveBeenCalledWith(`${URL}/stroke-matches`, {
    headers: expect.objectContaining({ "X-API-Key": "test-key" }),
  });

  const older = answering(404, { error: { code: "http_error", message: "Not Found" } });
  expect(await strokeMatchesOnServer("http://old:8000", { fetchFn: older })).toBe(
    false,
  );
  expect(await strokeMatchesOnServer("http://old:8000", { fetchFn: older })).toBe(
    false,
  );
  expect(older).toHaveBeenCalledTimes(1);
});

test("a probe that cannot tell is asked again next time", async () => {
  const offline = jest.fn(async (): Promise<Response> => {
    throw new TypeError("Network request failed");
  });
  expect(await strokeMatchesOnServer(URL, { fetchFn: offline })).toBeNull();
  const busy = answering(503, { error: { code: "map_data_unavailable", message: "" } });
  expect(await strokeMatchesOnServer(URL, { fetchFn: busy })).toBeNull();
  const yes = answering(204);
  expect(await strokeMatchesOnServer(URL, { fetchFn: yes })).toBe(true);
  expect(yes).toHaveBeenCalledTimes(1);
});
