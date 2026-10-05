import type { LatLon, RouteResult, Stretch, Walk } from "@shaperoute/shared-types";
import { useCallback, useState } from "react";

import type { AnyRouteRequest } from "../api/routes";
import type { LngLat } from "../map/coordinates";
import type { RouteState } from "../route/useRouteRequest";
import { leftElsewhere, movable, movedRequest } from "./shapeMove";

/** What the map draws of a route: the very arrays, so that a route kept on
 * the map is not sent to it again. */
type Drawn = {
  points: LatLon[];
  walks: Walk[] | null;
  onFoot: Stretch[] | null;
};

/** The route as it was when its shape was left somewhere, kept on the map
 * where the finger left it while the engine places it there. */
type Left = Drawn & { request: AnyRouteRequest };

export type MoveShape = {
  /** The route on screen is on the water and says where its shape is. */
  available: boolean;
  /** The user is moving the shape: a finger drags it, not the map. */
  moving: boolean;
  begin: () => void;
  cancel: () => void;
  /** The map's `onMoved`: asks for the route with its shape there. */
  onMoved: (by: LngLat) => void;
  /** While the moved route is drawn, the one of before for the map to keep
   * where it was left: the same arrays, so the map is not told again. */
  left: Drawn | null;
  /** The moved shape did not fit where it was left. */
  elsewhere: boolean;
};

/**
 * Moving the shape of the drawn route on the water (TASK-238): «Move the
 * shape», a drag on the map, and the same request again with `near`
 * (shapeMove.ts). `view` is the screen's route request, `shown` the route
 * of it on the map.
 */
export function useMoveShape(
  view: RouteState,
  shown: RouteResult | null,
  draw: (request: AnyRouteRequest) => void,
): MoveShape {
  // The route being moved: another route on screen is not.
  const [moved, setMoved] = useState<RouteResult | null>(null);
  const [left, setLeft] = useState<Left | null>(null);
  const available =
    view.status === "done" && shown !== null && movable(view.request, shown);

  const begin = useCallback(() => setMoved(shown), [shown]);
  const cancel = useCallback(() => setMoved(null), []);
  const onMoved = useCallback(
    (by: LngLat) => {
      // Only the route being moved: a drag told late is nobody's.
      if (view.status !== "done" || shown === null || moved !== shown) {
        return;
      }
      const request = movedRequest(view.request, shown, by);
      if (request === null) {
        return;
      }
      setMoved(null);
      setLeft({
        request,
        points: shown.points,
        walks: shown.walks ?? null,
        onFoot: shown.on_foot ?? null,
      });
      draw(request);
    },
    [view, shown, moved, draw],
  );

  return {
    available,
    moving: available && moved !== null && moved === shown,
    begin,
    cancel,
    onMoved,
    left:
      left !== null && view.status === "waiting" && view.request === left.request
        ? left
        : null,
    elsewhere:
      view.status === "done" && shown !== null && leftElsewhere(view.request, shown),
  };
}
