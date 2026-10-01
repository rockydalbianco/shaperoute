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
