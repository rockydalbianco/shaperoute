/**
 * A route of "Explore" opened on the map says how its shape is turned
 * (TASK-232, ADR-0195): the result the map, Start and the run read carries
 * it, each route of the choice its own. The rest is in explored.test.ts.
 */
import type { RouteResult } from "@shaperoute/shared-types";
import detail from "@shaperoute/shared-types/fixtures/recommended-route.json";
import routeResult from "@shaperoute/shared-types/fixtures/route-result.json";
import { act, renderHook } from "@testing-library/react-native";

import type { requestRoute } from "../api/routes";
import { forgetExamples, movedExample, useCityExamples } from "./exampleRoutes";
import { optionsOf, toResult, useExplored } from "./explored";
import type { RecommendedRoute, RecommendedRouteDetail } from "./recommendedRoutes";

// The star of the example is turned since TASK-232 part C: here, a route
// that does not say how it is turned.
const { rotation_deg: _starTurn, ...star } = detail as RecommendedRouteDetail;
const drawn = routeResult as unknown as RouteResult;
const [other] = drawn.alternatives ?? [];
/** The engine's route turned 30° counterclockwise; the other one upright. */
const tilted: RouteResult = { ...drawn, rotation_deg: 30 };

const listed: RecommendedRoute = {
  id: star.id,
  city: star.city,
  shape: star.shape,
  word: star.word,
  style: star.style,
  distance_m: star.distance_m,
  route_m: star.route_m,
  similarity: star.similarity,
  start: star.points[0],
  away_m: 120,
  preview: star.points,
};

test("the result of a turned route says how it is turned", () => {
  expect(toResult({ ...star, rotation_deg: -25 }).rotation_deg).toBe(-25);
  expect(toResult(detail as RecommendedRouteDetail).rotation_deg).toBe(-30);
  // A route that does not say: north up.
  expect(toResult(star)).not.toHaveProperty("rotation_deg");
  expect(toResult({ ...star, rotation_deg: 0 })).not.toHaveProperty("rotation_deg");
});

test("each route of the choice is turned as its own drawing", () => {
  const options = optionsOf(
    { ...listed, rotation_deg: 30 },
    { ...star, rotation_deg: 30 },
    [star, { ...star, rotation_deg: -20 }],
  );
  expect(options.map((o) => o.result.rotation_deg)).toEqual([30, undefined, -20]);
  // The route as the card shows it follows the one chosen: B is not turned
  // as A was.
  expect(options.map((o) => o.route.rotation_deg)).toEqual([30, undefined, -20]);
});

test("a city's example opens turned, and its other route north up", async () => {
  forgetExamples();
  const place = { label: "Vercelli, Piedmont, Italy", point: [45.3252, 8.4228] } as {
    label: string;
    point: [number, number];
  };
  const request = jest.fn().mockResolvedValue({
    kind: "route",
    result: tilted,
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
  expect(heart.route.rotation_deg).toBe(30);

  const { result: hook } = await renderHook(() => useExplored("http://api"));
  await act(async () => hook.current.open(heart.route));
  const first = hook.current.explored;
  if (first?.status !== "done") {
    throw new Error("the heart should be open");
  }
  expect(first.result.rotation_deg).toBe(30);
  expect(first.choices.map((c) => c.rotation_deg)).toEqual([30, undefined]);

  await act(async () => first.choose(1));
  const second = hook.current.explored;
  if (second?.status !== "done") {
    throw new Error("the other route should be open");
  }
  expect(second.result.points).toEqual(other.points);
  expect(second.result).not.toHaveProperty("rotation_deg");

  // Drawn again with its shape moved: the turn of the new route.
  await act(async () =>
    hook.current.redraw(movedExample(second.detail, { ...drawn, rotation_deg: -40 })),
  );
  const moved = hook.current.explored;
  expect(moved?.status === "done" && moved.result.rotation_deg).toBe(-40);
  forgetExamples();
});
