import detail from "@shaperoute/shared-types/fixtures/recommended-route.json";

import { toRequest, toResult } from "./explored";
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
