import type { RouteResult } from "@shaperoute/shared-types";
import detail from "@shaperoute/shared-types/fixtures/recommended-route.json";
import routeResult from "@shaperoute/shared-types/fixtures/route-result.json";
import { act, renderHook } from "@testing-library/react-native";

import type { requestRoute } from "../api/routes";
import { drawExamples, forgetExamples, useCityExamples } from "./exampleRoutes";
import { toRequest, toResult, useExplored } from "./explored";
import type { RecommendedRouteDetail } from "./recommendedRoutes";

const star = detail as RecommendedRouteDetail;

test("a shape becomes the request and result a drawn route has", () => {
  expect(toRequest(star)).toEqual({
    start: star.points[0],
    shape: "star",
    distance_m: 5000,
    activity: "running",
  });
  expect(toResult(star)).toMatchObject({
    points: star.points,
    distance_m: star.route_m,
    similarity: star.similarity,
    shape: "star",
    directions: [],
    word: null,
  });
});

test("a word keeps its style", () => {
  const word = { ...star, shape: null, word: "CIAO", style: "block" };
  expect(toRequest(word)).toMatchObject({ word: "CIAO", style: "block" });
  expect(toResult(word).shape).toBeNull();
});

test("an example on the water asks for paddling (TASK-191)", () => {
  expect(toRequest({ ...star, distance_m: 2000, activity: "paddling" })).toEqual({
    start: star.points[0],
    shape: "star",
    distance_m: 2000,
    activity: "paddling",
  });
});

test("a shape the app does not know has no request", () => {
  expect(toRequest({ ...star, shape: "unicorn" })).toBeNull();
});

test("a city's example opens at once, without asking the API (TASK-143)", async () => {
  forgetExamples();
  const city = {
    label: "Vercelli, Piedmont, Italy",
    point: [45.3252, 8.4228] as const,
  };
  const request = jest.fn().mockResolvedValue({
    kind: "route",
    result: routeResult as unknown as RouteResult,
  }) as unknown as typeof requestRoute;
  const storage = { load: () => ({}), save: jest.fn() };
  const place = { ...city, point: [...city.point] as [number, number] };
  drawExamples("http://api", place, { request, storage });
  const { result: examples } = await renderHook(() =>
    useCityExamples("http://api", place, { request, storage }),
  );
  await act(async () => undefined);
  const heart = examples.current.examples?.[0];
  if (heart?.status !== "ready") {
    throw new Error("the heart should be ready");
  }

  const fetchFn = jest.spyOn(globalThis, "fetch");
  const { result: hook } = await renderHook(() => useExplored("http://api"));
  await act(async () => hook.current.open(heart.route));
  expect(hook.current.explored).toMatchObject({
    status: "done",
    request: { shape: "heart", distance_m: 5000, start: routeResult.points[0] },
  });
  expect(fetchFn).not.toHaveBeenCalled();
  fetchFn.mockRestore();
});

test("a city's example opens with the routes to choose from (TASK-151)", async () => {
  forgetExamples();
  const place = { label: "Vercelli, Piedmont, Italy", point: [45.3252, 8.4228] } as {
    label: string;
    point: [number, number];
  };
  const drawn = routeResult as unknown as RouteResult;
  const [other] = drawn.alternatives ?? [];
  const request = jest.fn().mockResolvedValue({
    kind: "route",
    result: drawn,
  }) as unknown as typeof requestRoute;
  const storage = { load: () => ({}), save: jest.fn() };
  const { result: examples } = await renderHook(() =>
    useCityExamples("http://api", place, { request, storage }),
  );
  await act(async () => undefined);
  const heart = examples.current.examples?.[0];
  if (heart?.status !== "ready") {
    throw new Error("the heart should be ready");
  }

  const { result: hook } = await renderHook(() => useExplored("http://api"));
  await act(async () => hook.current.open(heart.route));
  const first = hook.current.explored;
  if (first?.status !== "done") {
    throw new Error("the heart should be open");
  }
  expect(first.choices.map((c) => c.points)).toEqual([drawn.points, other.points]);
  expect(first.chosen).toBe(0);
  expect(first.result).toBe(first.choices[0]);
  // The route not chosen is the grey line of the map (TASK-155).
  expect(first.others).toEqual([other.points]);

  // B: the card, the map, Start and the export are about it from now on.
  await act(async () => first.choose(1));
  const second = hook.current.explored;
  if (second?.status !== "done") {
    throw new Error("the heart should be open");
  }
  expect(second.chosen).toBe(1);
  expect(second.result).toBe(first.choices[1]);
  expect(second.detail.points).toBe(other.points);
  expect(second.route).toMatchObject({
    route_m: other.distance_m,
    similarity: other.similarity,
    start: other.points[0],
  });
  expect(second.request).toMatchObject({ shape: "heart", start: other.points[0] });
  expect(second.others).toEqual([drawn.points]);

  // A route that is not there is not chosen; A again is the same route.
  await act(async () => second.choose(5));
  expect(hook.current.explored).toMatchObject({ chosen: 1 });
  await act(async () => second.choose(0));
  expect(hook.current.explored).toMatchObject({ chosen: 0, result: first.result });
});

test("a route of the catalogue is the only one to choose", async () => {
  const fetchFn = jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(Response.json(detail));
  const { result: hook } = await renderHook(() => useExplored("http://api"));
  const listed = {
    ...star,
    start: star.points[0],
    away_m: 0,
    preview: star.points,
  };
  await act(async () => hook.current.open(listed));
  expect(hook.current.explored).toMatchObject({ status: "done", chosen: 0 });
  const opened = hook.current.explored;
  expect(opened?.status === "done" && opened.choices).toHaveLength(1);
  expect(opened?.status === "done" && opened.others).toEqual([]);
  fetchFn.mockRestore();
});

test("who opens a route may know a surer way to fetch it whole (TASK-188)", async () => {
  const fetchFn = jest.spyOn(globalThis, "fetch");
  const moved = { ...star, id: "trento-star-5000-7" };
  const fetchWhole = jest.fn().mockResolvedValue({ kind: "route", route: moved });
  const { result: hook } = await renderHook(() => useExplored("http://api"));
  const listed = { ...star, start: star.points[0], away_m: 0, preview: star.points };
  await act(async () => hook.current.open(listed, fetchWhole));
  expect(fetchWhole).toHaveBeenCalledWith("http://api", star.id);
  expect(hook.current.explored).toMatchObject({ status: "done", detail: moved });
  expect(fetchFn).not.toHaveBeenCalled();

  // And when that way fails, the route does not load.
  fetchWhole.mockResolvedValue({ kind: "failed" });
  await act(async () => hook.current.open(listed, fetchWhole));
  expect(hook.current.explored).toMatchObject({ status: "failed" });
  fetchFn.mockRestore();
});
