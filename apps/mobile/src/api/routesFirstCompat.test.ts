import type { JobStatus, RouteRequest } from "@shaperoute/shared-types";
import request from "@shaperoute/shared-types/fixtures/route-request.json";
import jobDone from "@shaperoute/shared-types/fixtures/route-job-done.json";
import result from "@shaperoute/shared-types/fixtures/route-result.json";

import { isRouteJob, MAX_WAIT_MS, POLL_MS, requestRoute } from "./routes";

/**
 * The app as it is published, in front of a server that knows the first
 * route (TASK-435, ADR-0361): a job may carry `first` while it computes.
 * An app that never asks for it reads the job as before and ends with the
 * whole result, as before. Part C teaches the app to ask; this file stays.
 */

const URL = "http://192.168.1.23:8000";
const JOB_URL = `${URL}/route-jobs/4f2c9e1a`;
const REQUEST = request as RouteRequest;

function job(status: JobStatus, extra: Record<string, unknown> = {}) {
  return { job_id: "4f2c9e1a", status, result: null, error: null, ...extra };
}

/** POST answers with the first body, each GET with the next. */
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

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test("a job with a first route is a job this app reads", () => {
  expect(isRouteJob(job("computing", { first: result }))).toBe(true);
  expect(isRouteJob(job("computing", { first: null }))).toBe(true);
  expect(isRouteJob({ ...jobDone, first: null })).toBe(true);
});

test("an app that does not ask for the first route ends with the whole result", async () => {
  const { fetchFn, asked } = api(
    job("queued"),
    job("computing"),
    // A server that says `first` to everybody would still be read.
    job("computing", { first: result }),
    job("computing", { first: result }),
    { ...jobDone, first: null },
  );
  const statuses: JobStatus[] = [];
  const pending = requestRoute(URL, REQUEST, {
    fetchFn,
    onStatus: (status) => statuses.push(status),
  });
  let outcome: Awaited<typeof pending> | undefined;
  void pending.then((value) => (outcome = value));
  for (
    let waited = 0;
    outcome === undefined && waited <= MAX_WAIT_MS;
    waited += POLL_MS
  ) {
    await jest.advanceTimersByTimeAsync(POLL_MS);
  }

  // The whole result, with its alternatives, as the job says it at the end.
  expect(outcome).toEqual({ kind: "route", result });
  expect(statuses).toEqual(["queued", "computing", "computing", "computing"]);
  // Never `?first=1`: the server sends this app the job of before.
  expect(asked()).toEqual([JOB_URL, JOB_URL, JOB_URL, JOB_URL]);
});
