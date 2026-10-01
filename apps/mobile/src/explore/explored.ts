import {
  type LetterStyle,
  type RouteResult,
  type Shape,
  SHAPES,
} from "@shaperoute/shared-types";
import { useCallback, useRef, useState } from "react";

import type { AnyRouteRequest } from "../route/useRouteRequest";
import {
  fetchRecommendedRoute,
  type RecommendedRoute,
  type RecommendedRouteDetail,
} from "./recommendedRoutes";

/** A route of "Explore" opened on the map. */
export type Explored =
  | { status: "loading"; route: RecommendedRoute }
  | {
      status: "done";
      route: RecommendedRoute;
      detail: RecommendedRouteDetail;
      /** As a drawn route has them: for the GPX export. */
      request: AnyRouteRequest;
      result: RouteResult;
    }
  | { status: "failed"; route: RecommendedRoute };

function isShape(value: string | null): value is Shape {
  return value !== null && (SHAPES as readonly string[]).includes(value);
}

/** The request a drawn route would have had: what the GPX export sends. */
export function toRequest(detail: RecommendedRouteDetail): AnyRouteRequest | null {
  const base = {
    start: detail.points[0],
    distance_m: detail.distance_m,
    activity: "running" as const,
  };
  if (detail.word !== null) {
    const style: LetterStyle = detail.style === "block" ? "block" : "round";
    return { ...base, word: detail.word, style };
  }
  return isShape(detail.shape) ? { ...base, shape: detail.shape } : null;
}

export function toResult(detail: RecommendedRouteDetail): RouteResult {
  return {
    points: detail.points,
    distance_m: detail.route_m,
    similarity: detail.similarity,
    shape: isShape(detail.shape) ? detail.shape : null,
    warnings: [],
    // Planned ahead, without turn-by-turn: no Start, only the GPX.
    directions: [],
    word: detail.word,
  };
}

/** Opens a route of "Explore": fetches it whole. The last one asked wins. */
export function useExplored(apiUrl: string | null): {
  explored: Explored | null;
  open: (route: RecommendedRoute) => void;
  close: () => void;
} {
  const [explored, setExplored] = useState<Explored | null>(null);
  const asked = useRef<string | null>(null);

  const open = useCallback(
    (route: RecommendedRoute) => {
      asked.current = route.id;
      if (apiUrl === null) {
        setExplored({ status: "failed", route });
        return;
      }
      setExplored({ status: "loading", route });
      void fetchRecommendedRoute(apiUrl, route.id).then((outcome) => {
        if (asked.current !== route.id) {
          return;
        }
        const request = outcome.kind === "route" ? toRequest(outcome.route) : null;
        setExplored(
          outcome.kind === "route" && request !== null
            ? {
                status: "done",
                route,
                detail: outcome.route,
                request,
                result: toResult(outcome.route),
              }
            : { status: "failed", route },
        );
      });
    },
    [apiUrl],
  );

  const close = useCallback(() => {
    asked.current = null;
    setExplored(null);
  }, []);

  return { explored, open, close };
}
