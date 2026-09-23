import type { RouteRequest } from "@shaperoute/shared-types";

import apiError from "@shaperoute/shared-types/fixtures/api-error.json";
import errorCodes from "@shaperoute/shared-types/fixtures/api-error-codes.json";
import request from "@shaperoute/shared-types/fixtures/route-request.json";
import result from "@shaperoute/shared-types/fixtures/route-result.json";
import { isRouteResult, requestRoute, ROUTE_TIMEOUT_MS } from "./routes";

const URL = "http://192.168.1.23:8000";
const REQUEST = request as RouteRequest;

function answers(status: number, body: unknown): jest.MockedFunction<typeof fetch> {
  return jest.fn().mockResolvedValue(Response.json(body, { status }));
}

/** A fetch that never answers, and fails like the real one when aborted. */
function silent(): typeof fetch {
  return (_input: unknown, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("Aborted")));
    });
}

afterEach(() => {
  jest.useRealTimers();
});

test("posts the request as JSON to /routes", async () => {
  const fetchFn = answers(200, result);
  await requestRoute(URL, REQUEST, { fetchFn });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://192.168.1.23:8000/routes");
  expect(init?.method).toBe("POST");
  expect(JSON.parse(String(init?.body))).toEqual(request);
});

test("a 200 gives the route", async () => {
  const outcome = await requestRoute(URL, REQUEST, { fetchFn: answers(200, result) });
  expect(outcome).toEqual({ kind: "route", result });
});

test.each(errorCodes)("an error with code %s keeps code and message", async (code) => {
  const body = { error: { ...apiError.error, code } };
  const outcome = await requestRoute(URL, REQUEST, { fetchFn: answers(422, body) });
  expect(outcome).toEqual({ kind: "api_error", code, message: apiError.error.message });
});

test.each([
  [200, { points: "none" }],
  [502, "<html>Bad gateway</html>"],
  [500, { error: { code: "a_new_code", message: "?" } }],
])("an answer the app cannot read (%i) is a bad answer", async (status, body) => {
  const outcome = await requestRoute(URL, REQUEST, { fetchFn: answers(status, body) });
  expect(outcome).toEqual({ kind: "bad_answer", status });
});

test("a network failure says which address was tried", async () => {
  const fetchFn = jest.fn().mockRejectedValue(new TypeError("Network request failed"));
  const outcome = await requestRoute(URL, REQUEST, { fetchFn });
  expect(outcome).toEqual({ kind: "unreachable", url: URL });
});

test("no answer within the limit is a timeout", async () => {
  jest.useFakeTimers();
  const pending = requestRoute(URL, REQUEST, { fetchFn: silent() });
  await jest.advanceTimersByTimeAsync(ROUTE_TIMEOUT_MS);
  await expect(pending).resolves.toEqual({ kind: "timeout" });
});

test("aborting the signal cancels the request", async () => {
  const controller = new AbortController();
  const pending = requestRoute(URL, REQUEST, {
    fetchFn: silent(),
    signal: controller.signal,
  });
  controller.abort();
  await expect(pending).resolves.toEqual({ kind: "cancelled" });
});

test("isRouteResult accepts the shared fixture and refuses broken points", () => {
  expect(isRouteResult(result)).toBe(true);
  expect(isRouteResult({ ...result, points: [[46.0671]] })).toBe(false);
  expect(isRouteResult({ ...result, shape: "star" })).toBe(false);
});
