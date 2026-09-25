import type { JobStatus, RouteResult } from "@shaperoute/shared-types";
import { useCallback, useRef, useState } from "react";

import {
  type AnyRouteRequest,
  isImageRequest,
  requestRoute,
  type RouteOutcome,
} from "../api/routes";

export type { AnyRouteRequest };

/** What can go wrong, as the screen explains it (see problems.ts). */
export type RouteProblem =
  | Exclude<RouteOutcome, { kind: "route" } | { kind: "cancelled" }>
  | { kind: "no_api_url" }
  /** Export GPX: the phone has no share sheet, or could not save the file. */
  | { kind: "no_sharing" }
  | { kind: "share_failed" };

export type RouteState =
  | { status: "idle" }
  | {
      status: "waiting";
      request: AnyRouteRequest;
      startedAt: number;
      /** What the API says it is doing; "sending" until it has answered. */
      phase: "sending" | JobStatus;
    }
  | { status: "done"; request: AnyRouteRequest; result: RouteResult }
  | { status: "failed"; request: AnyRouteRequest; problem: RouteProblem };

/**
 * One route request at a time: a new one, or `cancel`, stops waiting for the
 * previous and tells the API to drop it (ADR-0032).
 */
export function useRouteRequest(baseUrl: string | null): {
  state: RouteState;
  draw: (request: AnyRouteRequest) => void;
  cancel: () => void;
} {
  const [state, setState] = useState<RouteState>({ status: "idle" });
  const current = useRef<AbortController | null>(null);

  const draw = useCallback(
    (request: AnyRouteRequest) => {
      current.current?.abort();
      const mine = new AbortController();
      current.current = mine;
      setState({ status: "waiting", request, startedAt: Date.now(), phase: "sending" });
      const onStatus = (phase: JobStatus) => {
        if (current.current === mine) {
          setState((now) => (now.status === "waiting" ? { ...now, phase } : now));
        }
      };
      const outcome: Promise<RouteOutcome | { kind: "no_api_url" }> = baseUrl
        ? requestRoute(baseUrl, request, { signal: mine.signal, onStatus })
        : Promise.resolve({ kind: "no_api_url" });
      void outcome.then((answer) => {
        if (current.current !== mine) {
          return;
        }
        current.current = null;
        if (answer.kind === "cancelled") {
          setState({ status: "idle" });
        } else if (answer.kind === "route") {
          setState({ status: "done", request, result: answer.result });
        } else {
          setState({ status: "failed", request, problem: answer });
        }
      });
    },
    [baseUrl],
  );

  const cancel = useCallback(() => current.current?.abort(), []);

  return { state, draw, cancel };
}

/** Same start, shape, word or image, and distance: the state still belongs
 * to the screen. An image's outline is the same when it is the one traced
 * for the same picture: the same array. */
export function sameRequest(a: AnyRouteRequest, b: AnyRouteRequest): boolean {
  const drawn =
    isImageRequest(a) || isImageRequest(b)
      ? isImageRequest(a) && isImageRequest(b) && a.outline === b.outline
      : a.shape === b.shape && a.word === b.word;
  return (
    a.start[0] === b.start[0] &&
    a.start[1] === b.start[1] &&
    drawn &&
    a.distance_m === b.distance_m &&
    a.activity === b.activity
  );
}
