import type { JobStatus, RouteRequest } from "@shaperoute/shared-types";
import apiError from "@shaperoute/shared-types/fixtures/api-error.json";
import request from "@shaperoute/shared-types/fixtures/route-request.json";
import jobDone from "@shaperoute/shared-types/fixtures/route-job-done.json";
import jobFailed from "@shaperoute/shared-types/fixtures/route-job-failed.json";
import result from "@shaperoute/shared-types/fixtures/route-result.json";
import wordResult from "@shaperoute/shared-types/fixtures/route-result-word.json";

import {
  isRouteJob,
  isRouteResult,
  MAX_WAIT_MS,
  POLL_MS,
  requestRoute,
  type RouteOutcome,
} from "./routes";

const URL = "http://192.168.1.23:8000";
const JOB_URL = `${URL}/route-jobs/4f2c9e1a`;
const REQUEST = request as RouteRequest;

function job(status: JobStatus) {
  return { job_id: "4f2c9e1a", status, result: null, error: null };
}

type Reply = { status: number; body: unknown } | Error;

/**
 * A pretend API: POST answers with `posted`, each GET with the next reply
 * (the last one repeats), DELETE with 204. Aborted calls fail like fetch.
 */
function api(posted: Reply, ...polls: Reply[]) {
  const fetchFn = jest.fn(async (_input: unknown, init?: RequestInit) => {
    if (init?.signal?.aborted) {
      throw new Error("Aborted");
    }
    const method = init?.method ?? "GET";
    if (method === "DELETE") {
      return new Response(null, { status: 204 });
    }
    const reply =
      method === "POST" ? posted : polls.length > 1 ? polls.shift()! : polls[0];
    if (reply instanceof Error) {
      throw reply;
    }
    return Response.json(reply.body, { status: reply.status });
  });
  const calls = (method: string) =>
    fetchFn.mock.calls.filter(([, init]) => (init?.method ?? "GET") === method);
  return { fetchFn: fetchFn as unknown as typeof fetch, calls };
}

/** Starts a request and lets the fake clock run until it ends. */
async function run(
  fetchFn: typeof fetch,
  onStatus?: (status: JobStatus) => void,
): Promise<RouteOutcome> {
  const pending = requestRoute(URL, REQUEST, { fetchFn, onStatus });
  let outcome: RouteOutcome | undefined;
  void pending.then((value) => (outcome = value));
  for (let waited = 0; outcome === undefined && waited <= MAX_WAIT_MS * 2;) {
    await jest.advanceTimersByTimeAsync(POLL_MS);
    waited += POLL_MS;
  }
  return pending;
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test("posts the request, then asks every 2 s until the route is done", async () => {
  const { fetchFn, calls } = api(
    { status: 202, body: job("queued") },
    { status: 200, body: job("computing") },
    { status: 200, body: jobDone },
  );
  const statuses: JobStatus[] = [];
  const outcome = await run(fetchFn, (status) => statuses.push(status));

  expect(outcome).toEqual({ kind: "route", result });
  expect(statuses).toEqual(["queued", "computing"]);
  const [[url, init]] = calls("POST");
  expect(url).toBe(`${URL}/route-jobs`);
  expect(JSON.parse(String(init?.body))).toEqual(request);
  expect(calls("GET").map(([getUrl]) => getUrl)).toEqual([JOB_URL, JOB_URL]);
});

test("a download is reported before the computing", async () => {
  const { fetchFn } = api(
    { status: 202, body: job("queued") },
    { status: 200, body: job("downloading_map") },
    { status: 200, body: job("computing") },
    { status: 200, body: jobDone },
  );
  const statuses: JobStatus[] = [];
  await run(fetchFn, (status) => statuses.push(status));
  expect(statuses).toEqual(["queued", "downloading_map", "computing"]);
});

test("a failed job gives its error", async () => {
  const { fetchFn } = api(
    { status: 202, body: job("queued") },
    { status: 200, body: jobFailed },
  );
  expect(await run(fetchFn)).toEqual({ kind: "api_error", ...apiError.error });
});

test("a request refused at once gives its error", async () => {
  const body = { error: { code: "invalid_request", message: "distance_m: missing" } };
  const { fetchFn, calls } = api({ status: 422, body });
  expect(await run(fetchFn)).toEqual({ kind: "api_error", ...body.error });
  expect(calls("GET")).toHaveLength(0);
});

test("an API that cannot be reached at all says where it was looked for", async () => {
  const { fetchFn } = api(new TypeError("Network request failed"));
  expect(await run(fetchFn)).toEqual({ kind: "unreachable", url: URL });
});

test("two network errors while waiting are forgiven, three are not", async () => {
  const offline = new TypeError("Network request failed");
  const twice = api({ status: 202, body: job("queued") }, offline, offline, {
    status: 200,
    body: jobDone,
  });
  expect(await run(twice.fetchFn)).toEqual({ kind: "route", result });

  const thrice = api({ status: 202, body: job("queued") }, offline);
  expect(await run(thrice.fetchFn)).toEqual({ kind: "unreachable", url: URL });
});

test("a job the API no longer knows is lost", async () => {
  const unknown = { error: { code: "http_error", message: "Unknown route job" } };
  const { fetchFn } = api(
    { status: 202, body: job("queued") },
    { status: 404, body: unknown },
  );
  expect(await run(fetchFn)).toEqual({ kind: "lost" });
});

test("after 5 minutes the app stops waiting and drops the job", async () => {
  const { fetchFn, calls } = api(
    { status: 202, body: job("queued") },
    { status: 200, body: job("computing") },
  );
  expect(await run(fetchFn)).toEqual({ kind: "timeout" });
  expect(calls("DELETE").map(([url]) => url)).toEqual([JOB_URL]);
});

test("cancelling stops waiting and drops the job", async () => {
  const { fetchFn, calls } = api(
    { status: 202, body: job("queued") },
    { status: 200, body: job("computing") },
  );
  const controller = new AbortController();
  const pending = requestRoute(URL, REQUEST, { fetchFn, signal: controller.signal });
  await jest.advanceTimersByTimeAsync(POLL_MS * 2);
  controller.abort();
  await expect(pending).resolves.toEqual({ kind: "cancelled" });
  expect(calls("DELETE").map(([url]) => url)).toEqual([JOB_URL]);
});

test("an answer that is not a job is a bad answer", async () => {
  const { fetchFn } = api(
    { status: 202, body: job("queued") },
    { status: 200, body: "<html>proxy</html>" },
  );
  expect(await run(fetchFn)).toEqual({ kind: "bad_answer", status: 200 });
});

test("the guards accept the shared fixtures and refuse broken ones", () => {
  expect(isRouteResult(result)).toBe(true);
  expect(isRouteResult({ ...result, points: [[46.0671]] })).toBe(false);
  expect(isRouteJob(jobDone)).toBe(true);
  expect(isRouteJob(jobFailed)).toBe(true);
  expect(isRouteJob({ ...jobDone, status: "sleeping" })).toBe(false);
});

test("a route without directions, from an API older than TASK-048, is a bad answer", async () => {
  const { directions: _, ...old } = result;
  const { fetchFn } = api(
    { status: 202, body: job("queued") },
    { status: 200, body: { ...job("done"), result: old } },
  );
  expect(await run(fetchFn)).toEqual({ kind: "bad_answer", status: 200 });
});

test("the route guard checks directions and the shape or word", () => {
  const [first] = result.directions;
  expect(isRouteResult(wordResult)).toBe(true);
  expect(isRouteResult({ ...result, directions: null })).toBe(false);
  expect(isRouteResult({ ...result, directions: [{ ...first, turn: "jump" }] })).toBe(false);
  expect(isRouteResult({ ...result, directions: [{ ...first, street: 7 }] })).toBe(false);
  expect(isRouteResult({ ...result, directions: [{ ...first, joined: undefined }] })).toBe(false);
  expect(isRouteResult({ ...result, directions: [{ ...first, street: null }] })).toBe(true);
  expect(isRouteResult({ ...wordResult, word: undefined })).toBe(false);
  expect(isRouteResult({ ...result, word: "CIAO" })).toBe(false);
});
