import type { RecommendedRoute } from "./recommendedRoutes";

/**
 * How far from the place chosen a route may start and still be the place's
 * own (TASK-192, ADR-0155). The catalogue's routes start at most 1013 m from
 * the centre of their city, 98 of 100 within 500 m; a neighbour's start
 * farther: Levico's are 3.3 km from Caldonazzo's centre, 1.8 km from Barco.
 */
export const OWN_RADIUS_M = 1500;

export type ByPlace = {
  /** The routes that start in the place chosen. */
  own: RecommendedRoute[];
  /** Those of its neighbours, within the radius asked for: alternatives. */
  nearby: RecommendedRoute[];
};

/**
 * The routes near a chosen place, apart (TASK-192): a town beside another
 * has that one's routes within "near you", and none of them starts in it.
 * Each list keeps the API's order, the best first.
 */
export function byPlace(
  routes: readonly RecommendedRoute[],
  ownRadiusM: number = OWN_RADIUS_M,
): ByPlace {
  const own: RecommendedRoute[] = [];
  const nearby: RecommendedRoute[] = [];
  for (const route of routes) {
    (route.away_m <= ownRadiusM ? own : nearby).push(route);
  }
  return { own, nearby };
}
