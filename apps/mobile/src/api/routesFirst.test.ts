import type { JobStatus, RouteRequest, RouteResult } from "@shaperoute/shared-types";
import request from "@shaperoute/shared-types/fixtures/route-request.json";
import jobDone from "@shaperoute/shared-types/fixtures/route-job-done.json";
import jobFailed from "@shaperoute/shared-types/fixtures/route-job-failed.json";
import result from "@shaperoute/shared-types/fixtures/route-result.json";

import { MAX_WAIT_MS, POLL_MS, requestRoute, type RouteOutcome } from "./routes";

// The first route before the whole answer (TASK-435, ADR-0361): who gives
// `onFirst` asks the API for it, gets it once, and ends as before.

const URL = "http://192.168.1.23:8000";
const JOB_URL = `${URL}/route-jobs/4f2c9e1a`;
const REQUEST = request as RouteRequest;
/** The route from the user's own start: the answer's alternative, alone. */
const FIRST = { ...result.alternatives[0], alternatives: [] } as unknown as RouteResult;

function job(status: JobStatus, extra: Record<string, unknown> = {}) {
  return { job_id: "4f2c9e1a", status, result: null, error: null, ...extra };
}

/** POST answers with the first body, each GET with the next (the last repeats). */
function api(posted: unknown, ...polls: unknown[]) {
  const fetchFn = jest.fn(async (_input: unknown, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    if (method === "DELETE") {
      return new Response(null, { status: 204 });
    }
    const body =
      method === "POST" ? posted : polls.length > 1 ? polls.shift() : polls[0];
    return Response.json(body, { status: method === "POST" ? 202 : 200 });
  });
  const asked = () =>
    fetchFn.mock.calls
      .filter(([, init]) => (init?.method ?? "GET") === "GET")
      .map(([url]) => url);
  return { fetchFn: fetchFn as unknown as typeof fetch, asked };
}

async function run(
  fetchFn: typeof fetch,
  onFirst?: (first: RouteResult) => void,
): Promise<RouteOutcome> {
  const pending = requestRoute(URL, REQUEST, { fetchFn, onFirst });
  let outcome: RouteOutcome | undefined;
  void pending.then((value) => (outcome = value));
  for (
    let waited = 0;
    outcome === undefined && waited <= MAX_WAIT_MS * 2;
    waited += POLL_MS
  ) {
    await jest.advanceTimersByTimeAsync(POLL_MS);
  }
  return pending;
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test("asks for the first route until it has come, then reads the job as before", async () => {
  const { fetchFn, asked } = api(
    job("queued"),
    job("computing", { first: null }),
    job("computing", { first: FIRST }),
    job("computing"),
    jobDone,
  );
  const firsts: RouteResult[] = [];
  const outcome = await run(fetchFn, (first) => firsts.push(first));

  expect(firsts).toEqual([FIRST]);
  // The whole answer is the job's, as ever: what to show is the screen's.
  expect(outcome).toEqual({ kind: "route", result });
  expect(asked()).toEqual([
    `${JOB_URL}?first=1`,
    `${JOB_URL}?first=1`,
    JOB_URL,
    JOB_URL,
  ]);
});

test("the first route is told once, however often the API says it", async () => {
  const { fetchFn } = api(
    job("computing"),
    job("computing", { first: FIRST }),
    job("computing", { first: FIRST }),
    jobDone,
  );
  const onFirst = jest.fn();
  await run(fetchFn, onFirst);
  expect(onFirst).toHaveBeenCalledTimes(1);
});

test("an API before the first route: nothing is told, the route comes as before", async () => {
  const { fetchFn, asked } = api(job("queued"), job("computing"), jobDone);
  const onFirst = jest.fn();
  const outcome = await run(fetchFn, onFirst);

  expect(onFirst).not.toHaveBeenCalled();
  expect(outcome).toEqual({ kind: "route", result });
  // It ignores the parameter; the app goes on asking with it.
  expect(asked()).toEqual([`${JOB_URL}?first=1`, `${JOB_URL}?first=1`]);
});

test("a route done at once has no first route", async () => {
  const { fetchFn, asked } = api(jobDone);
  const onFirst = jest.fn();
  expect(await run(fetchFn, onFirst)).toEqual({ kind: "route", result });
  expect(onFirst).not.toHaveBeenCalled();
  expect(asked()).toEqual([]);
});

test("a first route that cannot be drawn is as none", async () => {
  const { fetchFn } = api(
    job("computing"),
    job("computing", { first: { points: [], distance_m: "far" } }),
    jobDone,
  );
  const onFirst = jest.fn();
  expect(await run(fetchFn, onFirst)).toEqual({ kind: "route", result });
  expect(onFirst).not.toHaveBeenCalled();
});

test("a turn this app has no words for is straight in the first route too", async () => {
  const [direction] = result.directions;
  const odd = { ...FIRST, directions: [{ ...direction, turn: "hairpin" }] };
  const { fetchFn } = api(job("computing"), job("computing", { first: odd }), jobDone);
  const firsts: RouteResult[] = [];
  await run(fetchFn, (first) => firsts.push(first));
  expect(firsts).toHaveLength(1);
  expect(firsts[0].directions[0].turn).toBe("straight");
});

test("a job that fails after its first route ends as a failed job", async () => {
  const { fetchFn } = api(
    job("computing"),
    job("computing", { first: FIRST }),
    jobFailed,
  );
  const onFirst = jest.fn();
  const outcome = await run(fetchFn, onFirst);
  expect(onFirst).toHaveBeenCalledTimes(1);
  expect(outcome.kind).toBe("api_error");
});

test("who gives no onFirst never asks for the first route", async () => {
  const { fetchFn, asked } = api(job("queued"), job("computing"), jobDone);
  await run(fetchFn);
  expect(asked()).toEqual([JOB_URL, JOB_URL]);
});
