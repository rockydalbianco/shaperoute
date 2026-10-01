import directionsRequest from "@shaperoute/shared-types/fixtures/route-directions-request.json";
import answered from "@shaperoute/shared-types/fixtures/route-directions.json";
import type { Direction, LatLon } from "@shaperoute/shared-types";

import { isDirections, requestDirections } from "./routeDirections";

const URL = "http://192.168.1.23:8000";
// The fixtures are the contract: they must fit the types as they are.
const POINTS = directionsRequest.points as LatLon[];
const DIRECTIONS = answered.directions as Direction[];

function answering(status: number, body: unknown) {
  return jest.fn(async () => Response.json(body, { status }));
}

test("sends the route's points and gets its directions", async () => {
  const fetchFn = answering(200, answered);
  const outcome = await requestDirections(URL, POINTS, { fetchFn });
  expect(outcome).toEqual({ kind: "directions", directions: DIRECTIONS });
  const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe(`${URL}/route-directions`);
  expect(init.method).toBe("POST");
  // The same request as the contract's fixture.
  expect(JSON.parse(init.body as string)).toEqual(directionsRequest);
  expect(DIRECTIONS.map((d) => d.turn)).toEqual(["depart", "straight", "right"]);
});

test("a route off the API's map gives the API's error", async () => {
  const error = {
    error: {
      code: "invalid_request",
      message: "The route does not follow the roads of this map.",
      suggested_distance_m: null,
      reason: null,
    },
  };
  const outcome = await requestDirections(URL, POINTS, {
    fetchFn: answering(422, error),
  });
  expect(outcome).toEqual({ kind: "api_error", ...error.error });
});

test("no API is unreachable, a cancelled request is cancelled", async () => {
  const failing = jest.fn(async () => {
    throw new Error("Network request failed");
  });
  expect(await requestDirections(URL, POINTS, { fetchFn: failing })).toEqual({
    kind: "unreachable",
    url: URL,
  });
  const stop = new AbortController();
  stop.abort();
  expect(
    await requestDirections(URL, POINTS, { fetchFn: failing, signal: stop.signal }),
  ).toEqual({ kind: "cancelled" });
});

test("an answer that is not directions is a bad answer", async () => {
  for (const body of [
    { directions: [] },
    { directions: [{ ...DIRECTIONS[0], turn: "jump" }] },
    {},
    null,
  ]) {
    expect(
      await requestDirections(URL, POINTS, { fetchFn: answering(200, body) }),
    ).toEqual({ kind: "bad_answer", status: 200 });
  }
  expect(
    await requestDirections(URL, POINTS, { fetchFn: answering(500, "oops") }),
  ).toEqual({ kind: "bad_answer", status: 500 });
  expect(isDirections(answered)).toBe(true);
});

test("the key goes with the request (TASK-081)", async () => {
  const fetchFn = answering(200, answered);
  await requestDirections(URL, POINTS, { fetchFn, key: "secret-key-for-tests" });
  const init = (fetchFn.mock.calls[0] as unknown[])[1] as RequestInit;
  expect(new Headers(init.headers).get("X-API-Key")).toBe("secret-key-for-tests");
});
