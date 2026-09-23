import type { RouteRequest } from "@shaperoute/shared-types";
import jobDone from "@shaperoute/shared-types/fixtures/route-job-done.json";
import request from "@shaperoute/shared-types/fixtures/route-request.json";
import result from "@shaperoute/shared-types/fixtures/route-result.json";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { sameRequest, useRouteRequest } from "./useRouteRequest";

const REQUEST = request as RouteRequest;
const fetchSpy = jest.spyOn(globalThis, "fetch");

afterEach(() => {
  fetchSpy.mockReset();
});

afterAll(() => {
  fetchSpy.mockRestore();
});

test("waits with the API's phase, then keeps the route with its request", async () => {
  jest.useFakeTimers();
  const computing = { ...jobDone, status: "computing", result: null };
  fetchSpy
    .mockResolvedValueOnce(Response.json(computing, { status: 202 }))
    .mockResolvedValueOnce(Response.json(jobDone));
  const { result: hook } = await renderHook(() => useRouteRequest("http://pc:8000"));
  await act(() => hook.current.draw(REQUEST));
  expect(hook.current.state).toMatchObject({ status: "waiting", phase: "computing" });

  await act(() => jest.advanceTimersByTimeAsync(2000));
  expect(hook.current.state).toEqual({ status: "done", request: REQUEST, result });
  jest.useRealTimers();
});

test("without an API address it fails without asking anyone", async () => {
  const { result: hook } = await renderHook(() => useRouteRequest(null));
  await act(() => hook.current.draw(REQUEST));
  await waitFor(() =>
    expect(hook.current.state).toEqual({
      status: "failed",
      request: REQUEST,
      problem: { kind: "no_api_url" },
    }),
  );
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("cancel goes back to idle", async () => {
  fetchSpy.mockImplementation(
    (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("Aborted")));
      }),
  );
  const { result: hook } = await renderHook(() => useRouteRequest("http://pc:8000"));
  await act(() => hook.current.draw(REQUEST));
  expect(hook.current.state.status).toBe("waiting");
  await act(() => hook.current.cancel());
  await waitFor(() => expect(hook.current.state).toEqual({ status: "idle" }));
});

test("sameRequest compares values, not objects", () => {
  expect(sameRequest(REQUEST, { ...REQUEST, start: [...REQUEST.start] })).toBe(true);
  expect(sameRequest(REQUEST, { ...REQUEST, distance_m: 3000 })).toBe(false);
  expect(sameRequest(REQUEST, { ...REQUEST, start: [46.0671, 11.1215] })).toBe(false);
});
