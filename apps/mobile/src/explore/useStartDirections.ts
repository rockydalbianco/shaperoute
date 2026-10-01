import type { Direction, LatLon } from "@shaperoute/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";

import { type DirectionsOutcome, requestDirections } from "../api/routeDirections";

/** Asking for the directions of a route of "Explore", before Start. */
export type StartState =
  | { status: "idle" }
  | { status: "loading"; points: LatLon[] }
  | { status: "failed"; points: LatLon[]; message: string };

/** What a card shows of it: another route's wait is not its own. */
export type StartView =
  { status: "idle" } | { status: "loading" } | { status: "failed"; message: string };

const IDLE: StartView = { status: "idle" };

export function startViewOf(state: StartState, points: LatLon[] | null): StartView {
  if (state.status === "idle" || state.points !== points) {
    return IDLE;
  }
  return state.status === "loading"
    ? { status: "loading" }
    : { status: "failed", message: state.message };
}

const UNREACHABLE = "The API did not answer. Check the connection and try again.";

/** Why there are no directions, in words for the card. */
export function failureText(outcome: DirectionsOutcome): string {
  if (outcome.kind === "api_error") {
    switch (outcome.code) {
      case "map_data_unavailable":
        return "The map of this area could not be loaded for directions. Try again later.";
      case "invalid_request":
        return "This route is not on the map the API has: it has no directions.";
      default:
        return "The directions could not be found. Try again.";
    }
  }
  if (outcome.kind === "bad_answer") {
    return "The API answered without directions. It may be out of date.";
  }
  return UNREACHABLE;
}

/**
 * Asks the API for the directions of a route of "Explore" (TASK-145,
 * ADR-0117) and hands them on to start: a route's directions are asked for
 * once, so a second Start on it does not wait. A new ask, or `reset`,
 * drops the one before, whose answer then starts nothing.
 */
export function useStartDirections(
  apiUrl: string | null,
  { fetchFn = fetch }: { fetchFn?: typeof fetch } = {},
): {
  state: StartState;
  start: (points: LatLon[], then: (directions: Direction[]) => void) => void;
  reset: () => void;
} {
  const [state, setState] = useState<StartState>({ status: "idle" });
  const run = useRef<AbortController | null>(null);
  // By the route's own list of points: the same route opened, not one alike.
  const known = useRef(new WeakMap<LatLon[], Direction[]>());

  const reset = useCallback(() => {
    run.current?.abort();
    run.current = null;
    setState({ status: "idle" });
  }, []);

  useEffect(() => () => run.current?.abort(), []);

  const start = useCallback(
    (points: LatLon[], then: (directions: Direction[]) => void) => {
      run.current?.abort();
      run.current = null;
      const had = known.current.get(points);
      if (had !== undefined) {
        setState({ status: "idle" });
        then(had);
        return;
      }
      if (apiUrl === null) {
        setState({ status: "failed", points, message: UNREACHABLE });
        return;
      }
      const controller = new AbortController();
      run.current = controller;
      setState({ status: "loading", points });
      void requestDirections(apiUrl, points, {
        fetchFn,
        signal: controller.signal,
      }).then((outcome) => {
        if (controller.signal.aborted) {
          return;
        }
        run.current = null;
        if (outcome.kind === "directions") {
          known.current.set(points, outcome.directions);
          setState({ status: "idle" });
          then(outcome.directions);
          return;
        }
        setState({ status: "failed", points, message: failureText(outcome) });
      });
    },
    [apiUrl, fetchFn],
  );

  return { state, start, reset };
}
