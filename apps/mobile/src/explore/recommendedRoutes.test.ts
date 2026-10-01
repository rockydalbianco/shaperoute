import detail from "@shaperoute/shared-types/fixtures/recommended-route.json";
import list from "@shaperoute/shared-types/fixtures/recommended-routes.json";

import {
  cityName,
  fetchRecommended,
  fetchRecommendedRoute,
  isRecommendedDetail,
  isRecommendedList,
  recommendedUrl,
  routeTitle,
} from "./recommendedRoutes";

test("the API's bodies pass the guards", () => {
  expect(isRecommendedList(list)).toBe(true);
  expect(isRecommendedDetail(detail)).toBe(true);
});

test("a route with both a shape and a word, or neither, does not pass", () => {
  const [first] = list.routes;
  expect(isRecommendedList({ routes: [{ ...first, word: "CIAO" }] })).toBe(false);
  expect(isRecommendedList({ routes: [{ ...first, shape: null }] })).toBe(false);
  expect(isRecommendedList({ routes: [{ ...first, preview: [[46, 11]] }] })).toBe(
    false,
  );
  expect(isRecommendedDetail({ ...detail, points: "no" })).toBe(false);
});

test("the url carries the start and the radius", () => {
  expect(recommendedUrl("http://api", [46.067, 11.1215])).toBe(
    "http://api/recommended-routes?lat=46.067&lon=11.1215&radius_m=5000",
  );
});

test("fetches the list and one route, and never throws", async () => {
  const ok = jest.fn().mockResolvedValue(Response.json(list));
  expect(
    await fetchRecommended("http://api", [46, 11], { fetchFn: ok, key: null }),
  ).toEqual({
    kind: "routes",
    routes: list.routes,
  });
  const one = jest.fn().mockResolvedValue(Response.json(detail));
  expect(
    await fetchRecommendedRoute("http://api", "trento-star-5000-0", {
      fetchFn: one,
      key: null,
    }),
  ).toEqual({ kind: "route", route: detail });
  expect(one).toHaveBeenCalledWith(
    "http://api/recommended-routes/trento-star-5000-0",
    expect.anything(),
  );
  const down = jest.fn().mockRejectedValue(new TypeError("Network request failed"));
  expect(await fetchRecommended("http://api", [46, 11], { fetchFn: down })).toEqual({
    kind: "failed",
  });
  const missing = jest
    .fn()
    .mockResolvedValue(Response.json({ error: {} }, { status: 404 }));
  expect(await fetchRecommendedRoute("http://api", "x", { fetchFn: missing })).toEqual({
    kind: "failed",
  });
});

test("titles and city names as the user reads them", () => {
  expect(routeTitle({ shape: "dog_head", word: null })).toBe("dog head");
  expect(routeTitle({ shape: null, word: "CIAO" })).toBe("CIAO");
  expect(cityName("milano")).toBe("Milano");
  expect(cityName("newyork")).toBe("New York");
});
