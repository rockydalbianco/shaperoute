import type { RouteRequest, RouteResult } from "@shaperoute/shared-types";
import jobDone from "@shaperoute/shared-types/fixtures/route-job-done.json";
import jobFailed from "@shaperoute/shared-types/fixtures/route-job-failed.json";
import request from "@shaperoute/shared-types/fixtures/route-request.json";
import result from "@shaperoute/shared-types/fixtures/route-result.json";
import { act, renderHook } from "@testing-library/react-native";

import { routeQueue } from "../api/routeQueue";
import { choicesOf } from "./choices";
import { useRouteRequest } from "./useRouteRequest";

// The first route on screen before the whole answer (TASK-435, ADR-0361):
// «the first stays A».

const REQUEST = request as RouteRequest;
const WHOLE = result as unknown as RouteResult;
/** The route from the user's own start: here, the answer's alternative. */
const FIRST = { ...result.alternatives[0], alternatives: [] } as unknown as RouteResult;
const computing = { ...jobDone, status: "computing", result: null };
const fetchSpy = jest.spyOn(globalThis, "fetch");

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  fetchSpy.mockReset();
  routeQueue.forget();
});

afterAll(() => {
  fetchSpy.mockRestore();
});

/** The hook after «Draw route» and the first read of the job. */
async function drawn(...reads: unknown[]) {
  fetchSpy.mockResolvedValueOnce(Response.json(computing, { status: 202 }));
  for (const read of reads) {
    fetchSpy.mockResolvedValueOnce(Response.json(read));
  }
  const { result: hook } = await renderHook(() => useRouteRequest("http://pc:8000"));
  await act(() => hook.current.draw(REQUEST));
  await act(() => jest.advanceTimersByTimeAsync(500));
  return hook;
}

test("the first route is on screen while the others are coming", async () => {
  const hook = await drawn({ ...computing, first: FIRST }, computing);
  expect(hook.current.state).toEqual({
    status: "done",
    request: REQUEST,
    result: FIRST,
    more: true,
  });
  // The job was asked with ?first=1; once the first route came, without.
  expect(fetchSpy.mock.calls[1][0]).toBe("http://pc:8000/route-jobs/4f2c9e1a?first=1");
  await act(() => jest.advanceTimersByTimeAsync(500));
  expect(fetchSpy.mock.calls[2][0]).toBe("http://pc:8000/route-jobs/4f2c9e1a");
  expect(hook.current.state).toMatchObject({ status: "done", more: true });
});

test("the whole answer adds its routes after the first, which stays A", async () => {
  const hook = await drawn({ ...computing, first: FIRST }, jobDone);
  await act(() => jest.advanceTimersByTimeAsync(500));

  const state = hook.current.state;
  if (state.status !== "done") {
    throw new Error(`not done: ${state.status}`);
  }
  expect(state.more).toBeUndefined();
  // The engine chose another route (0.91): it is B, with its percentage.
  expect(choicesOf(state.result).map((route) => route.similarity)).toEqual([
    FIRST.similarity,
    WHOLE.similarity,
  ]);
  expect(state.result.points).toEqual(FIRST.points);
});

test("a job that fails after its first route leaves the first route, alone", async () => {
  const hook = await drawn({ ...computing, first: FIRST }, jobFailed);
  await act(() => jest.advanceTimersByTimeAsync(500));
  expect(hook.current.state).toEqual({
    status: "done",
    request: REQUEST,
    result: FIRST,
  });
});

test("a job the API forgot after its first route leaves the first route too", async () => {
  fetchSpy.mockResolvedValueOnce(Response.json(computing, { status: 202 }));
  fetchSpy.mockResolvedValueOnce(Response.json({ ...computing, first: FIRST }));
  fetchSpy.mockResolvedValueOnce(
    Response.json(
      { error: { code: "http_error", message: "Not Found" } },
      { status: 404 },
    ),
  );
  const { result: hook } = await renderHook(() => useRouteRequest("http://pc:8000"));
  await act(() => hook.current.draw(REQUEST));
  await act(() => jest.advanceTimersByTimeAsync(1000));
  expect(hook.current.state).toEqual({
    status: "done",
    request: REQUEST,
    result: FIRST,
  });
});

test("without a first route the answer is the engine's, as before", async () => {
  const hook = await drawn(computing, jobDone);
  await act(() => jest.advanceTimersByTimeAsync(500));
  expect(hook.current.state).toEqual({
    status: "done",
    request: REQUEST,
    result: WHOLE,
  });
});

test("a new request leaves the first route of the one before behind", async () => {
  const hook = await drawn({ ...computing, first: FIRST });
  expect(hook.current.state).toMatchObject({ status: "done", more: true });

  const other: RouteRequest = { ...REQUEST, distance_m: REQUEST.distance_m + 1000 };
  fetchSpy.mockResolvedValue(Response.json(computing, { status: 202 }));
  await act(() => hook.current.draw(other));
  expect(hook.current.state).toMatchObject({ status: "waiting", request: other });
});
