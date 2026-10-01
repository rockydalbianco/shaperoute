import directionsRequest from "@shaperoute/shared-types/fixtures/route-directions-request.json";
import answered from "@shaperoute/shared-types/fixtures/route-directions.json";
import type { LatLon } from "@shaperoute/shared-types";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { startViewOf, useStartDirections } from "./useStartDirections";

const points = directionsRequest.points as LatLon[];
const mapMissing = {
  error: {
    code: "map_data_unavailable",
    message: "OpenStreetMap data for this area could not be downloaded.",
    suggested_distance_m: null,
    reason: null,
  },
};

test("asks for the directions, then starts with them", async () => {
  const fetchFn = jest.fn().mockResolvedValue(Response.json(answered));
  const then = jest.fn();
  const { result } = await renderHook(() =>
    useStartDirections("http://api", { fetchFn }),
  );
  await act(async () => result.current.start(points, then));
  await waitFor(() => expect(then).toHaveBeenCalledWith(answered.directions));
  expect(result.current.state.status).toBe("idle");
  expect(fetchFn.mock.calls[0][0]).toBe("http://api/route-directions");
});

test("the same route starts again without asking", async () => {
  const fetchFn = jest.fn(async () => Response.json(answered));
  const then = jest.fn();
  const { result } = await renderHook(() =>
    useStartDirections("http://api", { fetchFn }),
  );
  await act(async () => result.current.start(points, then));
  await waitFor(() => expect(then).toHaveBeenCalledTimes(1));
  await act(async () => result.current.start(points, then));
  expect(then).toHaveBeenCalledTimes(2);
  expect(fetchFn).toHaveBeenCalledTimes(1);
  // A route alike, but another list: asked for.
  await act(async () => result.current.start([...points], then));
  await waitFor(() => expect(then).toHaveBeenCalledTimes(3));
  expect(fetchFn).toHaveBeenCalledTimes(2);
});

test("while it waits, the route's card says so, and no other's", async () => {
  let answer: (response: Response) => void = () => {};
  const fetchFn = jest.fn(
    () =>
      new Promise<Response>((resolve) => {
        answer = resolve;
      }),
  );
  const { result } = await renderHook(() =>
    useStartDirections("http://api", { fetchFn }),
  );
  await act(async () => result.current.start(points, () => {}));
  expect(startViewOf(result.current.state, points)).toEqual({ status: "loading" });
  expect(startViewOf(result.current.state, [...points])).toEqual({ status: "idle" });
  expect(startViewOf(result.current.state, null)).toEqual({ status: "idle" });
  await act(async () => answer(Response.json(answered)));
  await waitFor(() => expect(result.current.state.status).toBe("idle"));
});

test("a failure says why, and Start again asks again", async () => {
  const fetchFn = jest
    .fn()
    .mockResolvedValueOnce(Response.json(mapMissing, { status: 503 }))
    .mockResolvedValueOnce(Response.json(answered));
  const then = jest.fn();
  const { result } = await renderHook(() =>
    useStartDirections("http://api", { fetchFn }),
  );
  await act(async () => result.current.start(points, then));
  await waitFor(() => expect(result.current.state.status).toBe("failed"));
  const view = startViewOf(result.current.state, points);
  expect(view.status === "failed" && view.message).toMatch(/map of this area/);
  expect(then).not.toHaveBeenCalled();
  await act(async () => result.current.start(points, then));
  await waitFor(() => expect(then).toHaveBeenCalledTimes(1));
});

test("an answer after reset starts nothing", async () => {
  let answer: (response: Response) => void = () => {};
  const fetchFn = jest.fn(
    (_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        answer = resolve;
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      }),
  );
  const then = jest.fn();
  const { result } = await renderHook(() =>
    useStartDirections("http://api", { fetchFn }),
  );
  await act(async () => result.current.start(points, then));
  await act(async () => result.current.reset());
  await act(async () => answer(Response.json(answered)));
  expect(then).not.toHaveBeenCalled();
  expect(result.current.state.status).toBe("idle");
});

test("without an API, Start says it did not answer", async () => {
  const { result } = await renderHook(() => useStartDirections(null));
  await act(async () => result.current.start(points, () => {}));
  const view = startViewOf(result.current.state, points);
  expect(view.status === "failed" && view.message).toMatch(/did not answer/);
});
