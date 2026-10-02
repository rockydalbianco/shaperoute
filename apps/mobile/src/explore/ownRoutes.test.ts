import list from "@shaperoute/shared-types/fixtures/recommended-routes.json";

import { byPlace, OWN_RADIUS_M } from "./ownRoutes";
import { isRecommendedList, type RecommendedRoute } from "./recommendedRoutes";

if (!isRecommendedList(list)) {
  throw new Error("the fixture is not a list of recommended routes");
}
const [fixture] = list.routes;

function route(id: string, awayM: number): RecommendedRoute {
  return { ...fixture, id, away_m: awayM };
}

test("a town beside another has no route of its own: all are nearby", () => {
  // Levico's catalogue as Caldonazzo's centre sees it.
  const routes = [
    route("levico-star", 3336),
    route("levico-moon", 3493),
    route("levico-ciao", 3858),
  ];
  expect(byPlace(routes)).toEqual({ own: [], nearby: routes });
});

test("the routes of the city chosen are its own", () => {
  const routes = [route("trento-heart", 29), route("trento-star", 1009)];
  expect(byPlace(routes)).toEqual({ own: routes, nearby: [] });
});

test("each list keeps the order the API gave", () => {
  const a = route("a", 20);
  const b = route("b", 4000);
  const c = route("c", OWN_RADIUS_M);
  const d = route("d", OWN_RADIUS_M + 1);
  expect(byPlace([b, a, d, c])).toEqual({ own: [a, c], nearby: [b, d] });
});

test("no routes, no lists", () => {
  expect(byPlace([])).toEqual({ own: [], nearby: [] });
});
