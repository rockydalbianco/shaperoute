import type {
  ImageRouteRequest,
  JobStatus,
  RouteRequest,
} from "@shaperoute/shared-types";
import apiError from "@shaperoute/shared-types/fixtures/api-error.json";
import request from "@shaperoute/shared-types/fixtures/route-request.json";
import jobDone from "@shaperoute/shared-types/fixtures/route-job-done.json";
import jobFailed from "@shaperoute/shared-types/fixtures/route-job-failed.json";
import result from "@shaperoute/shared-types/fixtures/route-result.json";
import imageRequest from "@shaperoute/shared-types/fixtures/image-route-request.json";
import imageResult from "@shaperoute/shared-types/fixtures/route-result-image.json";
import wordResult from "@shaperoute/shared-types/fixtures/route-result-word.json";

import {
  isRouteJob,
  isRouteResult,
  MAX_WAIT_MS,
  POLL_MS,
  pollDelay,
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

test("posts the request, then asks until the route is done", async () => {
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

test("the first asks come sooner, a long route is asked every 2 s", async () => {
  expect(pollDelay(0)).toBe(500);
  expect(pollDelay(5_999)).toBe(500);
  expect(pollDelay(6_000)).toBe(1_000);
  expect(pollDelay(19_999)).toBe(1_000);
  expect(pollDelay(20_000)).toBe(POLL_MS);
  expect(pollDelay(MAX_WAIT_MS)).toBe(POLL_MS);
  // Never slower than the caller asked.
  expect(pollDelay(0, 100)).toBe(100);

  const { fetchFn, calls } = api(
    { status: 202, body: job("queued") },
    { status: 200, body: job("computing") },
  );
  const controller = new AbortController();
  const pending = requestRoute(URL, REQUEST, { fetchFn, signal: controller.signal });
  const asks = async (ms: number) => {
    await jest.advanceTimersByTimeAsync(ms);
    return calls("GET").length;
  };
  expect(await asks(499)).toBe(0);
  expect(await asks(1)).toBe(1);
  // 12 in the first 6 s, 14 more up to 20 s, then one every 2 s.
  expect(await asks(5_500)).toBe(12);
  expect(await asks(14_000)).toBe(26);
  expect(await asks(10_000)).toBe(31);
  controller.abort();
  await pending;
});

test("a route the API kept is done in the answer to the POST", async () => {
  const { fetchFn, calls } = api({ status: 202, body: jobDone });
  const pending = requestRoute(URL, REQUEST, { fetchFn });
  // No timer runs: the route is there before the first wait.
  expect(await pending).toEqual({ kind: "route", result });
  expect(calls("GET")).toHaveLength(0);
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
  expect(isRouteJob({ ...jobDone, status: 7 })).toBe(false);
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
  expect(isRouteResult({ ...result, directions: [{ ...first, turn: "jump" }] })).toBe(
    false,
  );
  expect(isRouteResult({ ...result, directions: [{ ...first, street: 7 }] })).toBe(
    false,
  );
  expect(
    isRouteResult({ ...result, directions: [{ ...first, joined: undefined }] }),
  ).toBe(false);
  expect(isRouteResult({ ...result, directions: [{ ...first, street: null }] })).toBe(
    true,
  );
  expect(isRouteResult({ ...wordResult, word: undefined })).toBe(false);
  expect(isRouteResult({ ...result, word: "CIAO" })).toBe(false);
});

test("an image's outline is posted to /image-route-jobs, and read as any job", async () => {
  const done = { ...jobDone, result: imageResult };
  const { fetchFn, calls } = api(
    { status: 202, body: job("queued") },
    { status: 200, body: done },
  );
  const pending = requestRoute(URL, imageRequest as ImageRouteRequest, { fetchFn });
  await jest.advanceTimersByTimeAsync(POLL_MS);
  expect(await pending).toEqual({ kind: "route", result: imageResult });
  expect(calls("POST")[0][0]).toBe(`${URL}/image-route-jobs`);
  expect(calls("POST")[0][1]?.body).toBe(JSON.stringify(imageRequest));
  expect(calls("GET")[0][0]).toBe(JOB_URL);
});

test("an image route has neither shape nor word, and says so with nulls", () => {
  expect(isRouteResult(imageResult)).toBe(true);
  expect(isRouteResult({ ...imageResult, word: undefined })).toBe(false);
});

test("with a key, every call of a route job carries it (TASK-081)", async () => {
  const { fetchFn, calls } = api(
    { status: 202, body: job("queued") },
    { status: 200, body: job("computing") },
  );
  const controller = new AbortController();
  const pending = requestRoute(URL, REQUEST, {
    fetchFn,
    signal: controller.signal,
    apiKey: "secret-key-for-tests",
  });
  await jest.advanceTimersByTimeAsync(POLL_MS * 2);
  controller.abort();
  await pending;
  const sent = ["POST", "GET", "DELETE"].flatMap((method) =>
    calls(method).map(([, init]) => new Headers(init?.headers).get("X-API-Key")),
  );
  expect(sent.length).toBeGreaterThanOrEqual(3);
  expect(sent.every((key) => key === "secret-key-for-tests")).toBe(true);
});

test("without a key no key header is sent", async () => {
  const { fetchFn, calls } = api({ status: 202, body: jobDone });
  await run(fetchFn);
  const [, init] = calls("POST")[0];
  expect(new Headers(init?.headers).has("X-API-Key")).toBe(false);
});

test("a wrong key is an error of the API, with its code", async () => {
  const body = { error: { code: "unauthorized", message: "Missing or wrong API key" } };
  const { fetchFn } = api({ status: 401, body });
  expect(await run(fetchFn)).toEqual({ kind: "api_error", ...body.error });
});

test("a 502 between two good asks is forgiven, three in a row are not (TASK-254)", async () => {
  const proxy = { status: 502, body: "<html>Bad Gateway</html>" };
  const once = api(
    { status: 202, body: job("queued") },
    proxy,
    { status: 200, body: job("computing") },
    proxy,
    { status: 200, body: jobDone },
  );
  expect(await run(once.fetchFn)).toEqual({ kind: "route", result });

  const thrice = api({ status: 202, body: job("queued") }, proxy);
  expect(await run(thrice.fetchFn)).toEqual({ kind: "bad_answer", status: 502 });
  expect(thrice.calls("GET")).toHaveLength(3);

  // The API's own error, whatever its status, ends the request at once.
  const own = api(
    { status: 202, body: job("queued") },
    { status: 503, body: apiError },
  );
  expect(await run(own.fetchFn)).toMatchObject({ kind: "api_error" });
  expect(own.calls("GET")).toHaveLength(1);
});

test("what a newer API sends is read, not refused (TASK-254)", async () => {
  // A shape this version of the app has no tile for is a route all the same.
  expect(isRouteResult({ ...result, shape: "unicorn" })).toBe(true);
  expect(isRouteResult({ ...result, shape: "unicorn", word: "CIAO" })).toBe(false);

  // A turn it has no words for is read as "straight"; a status it does not
  // know is work in progress.
  const [first, ...rest] = result.directions;
  const newer = {
    ...jobDone,
    result: { ...result, directions: [first, { ...rest[0], turn: "roundabout" }, ...rest.slice(1)] },
  };
  const statuses: JobStatus[] = [];
  const { fetchFn } = api(
    { status: 202, body: { ...job("queued"), status: "planning" } },
    { status: 200, body: newer },
  );
  const outcome = await run(fetchFn, (status) => statuses.push(status));
  expect(statuses).toEqual(["computing"]);
  expect(outcome.kind).toBe("route");
  expect(outcome.kind === "route" && outcome.result.directions[1].turn).toBe("straight");
  expect(outcome.kind === "route" && outcome.result.directions[0]).toEqual(first);

  // An error code it does not know is an error, with the API's words.
  const refused = {
    ...jobFailed,
    error: { code: "quota_exceeded", message: "Enough routes today.", suggested_distance_m: null },
  };
  const failing = api({ status: 202, body: job("queued") }, { status: 200, body: refused });
  expect(await run(failing.fetchFn)).toEqual({
    kind: "api_error",
    code: "quota_exceeded",
    message: "Enough routes today.",
    suggested_distance_m: null,
  });
});
