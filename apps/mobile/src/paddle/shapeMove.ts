import type { LatLon, RouteRequest, RouteResult } from "@shaperoute/shared-types";

import { type AnyRouteRequest, isImageRequest } from "../api/routes";
import { type LngLat, metresBetween } from "../map/coordinates";

/**
 * Moving the shape of a route on the water (TASK-238, ADR-0202). The user
 * drags the shape on the map; the app asks for the same route with `near`,
 * where the centre of the shape was left, and the engine places the shape
 * at the nearest place to it where it fits: off the shore, within 1 km of
 * it, with a start reachable on foot. The app never moves a point of the
 * route itself.
 */

/**
 * Farther than this from where it was left, the shape did not fit there:
 * the screen says so. Closer, a finger on the map cannot tell (the engine
 * itself counts 30 m as there, and looks at the water on a grid).
 */
export const NOT_THERE_M = 80;

/** A route on the water whose result says where its shape is: an API of
 * before TASK-238 does not, and its shapes are not moved. */
export function movable(
  request: AnyRouteRequest,
  result: RouteResult,
): request is RouteRequest {
  return (
    !isImageRequest(request) &&
    request.activity === "paddling" &&
    result.centre !== undefined &&
    result.centre !== null
  );
}

/** Where the centre of the shape is wanted after a drag of `by` degrees of
 * longitude and latitude on the map. */
export function movedCentre(centre: LatLon, by: LngLat): LatLon {
  return [centre[0] + by[1], centre[1] + by[0]];
}

/**
 * The request for the same route with its shape moved by `by`: the same
 * start, so the shape stays within reach of where the user asked from.
 * Null when the route cannot be moved.
 */
export function movedRequest(
  request: AnyRouteRequest,
  result: RouteResult,
  by: LngLat,
): RouteRequest | null {
  if (!movable(request, result) || !result.centre) {
    return null;
  }
  return { ...request, near: movedCentre(result.centre, by) };
}

/**
 * Whether the shape of a moved route is away from where it was left: it did
 * not fit there, and the engine placed it at the nearest place where it
 * does. False for a route that was not moved.
 */
export function leftElsewhere(request: AnyRouteRequest, result: RouteResult): boolean {
  if (isImageRequest(request) || !request.near || !result.centre) {
    return false;
  }
  return metresBetween(request.near, result.centre) > NOT_THERE_M;
}
