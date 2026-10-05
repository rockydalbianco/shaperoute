import type { RouteResult } from "@shaperoute/shared-types";

import type { AnyRouteRequest } from "../api/routes";
import { t } from "../i18n";
import { APP_DISTANCE_LIMITS_KM } from "./distance";
import type { ChoiceKind } from "./problems";
import { sameRequest } from "./useRouteRequest";

/** The request a «Try» under a route left, and the distance it asked for
 * instead (TASK-234). */
export type Left = { from: AnyRouteRequest; to: number };

/**
 * The distance to offer under a route (TASK-234, ADR-0197): the one where,
 * the API says, the shape comes out clearly better. `result` is the
 * engine's choice: the advice is the request's, not an alternative's. None
 * without it (an older API), on the water (ADR-0164), outside the distances
 * «Draw» offers for the activity, at the distance asked for, nor back to
 * the distance a «Try» has just `left` for this one: no back and forth.
 */
export function betterDistanceM(
  result: RouteResult,
  request: AnyRouteRequest,
  left: Left | null = null,
): number | null {
  const advised = result.better_distance_m;
  if (advised == null || request.activity === "paddling") {
    return null;
  }
  const [lowest, highest] = APP_DISTANCE_LIMITS_KM[request.activity];
  if (advised < lowest * 1000 || advised > highest * 1000) {
    return null;
  }
  if (advised === request.distance_m) {
    return null;
  }
  const back =
    left !== null &&
    left.to === request.distance_m &&
    left.from.distance_m === advised &&
    sameRequest(left.from, { ...request, distance_m: advised });
  return back ? null : advised;
}

/** The line that offers it, for what the route draws. */
export function betterDistanceText(kind: ChoiceKind, distanceM: number): string {
  const values = { km: distanceM / 1000 };
  switch (kind) {
    case "word":
      return t("This word comes out better at about {km} km.", values);
    case "image":
      return t("This outline comes out better at about {km} km.", values);
    default:
      return t("This shape comes out better at about {km} km.", values);
  }
}

/** Its button: writes the distance and draws again. */
export function tryText(distanceM: number): string {
  return t("Try {km} km", { km: distanceM / 1000 });
}
