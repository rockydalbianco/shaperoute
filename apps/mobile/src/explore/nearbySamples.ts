import type { Shape } from "@shaperoute/shared-types";
import { useEffect, useSyncExternalStore } from "react";

import { requestRoute, type RouteOutcome } from "../api/routes";
import type { Place } from "../places/photon";
import {
  asRecommended,
  cityKey,
  EXAMPLE_DISTANCE_M,
  EXAMPLE_SHAPES,
  DRAW_ORDER,
} from "./exampleRoutes";
import type { RecommendedRoute } from "./recommendedRoutes";

/**
 * The samples of the towns near the start (TASK-236): for each town, one
 * after the other, the first shapes a city's examples begin with, asked of
 * the API as when the town is tapped. The API downloads the town's zone for
 * the first and keeps each route (its ADR-0136): the town opens with its
 * first cards ready, and its card here shows one of them meanwhile.
 *
 * Apart from the examples of a chosen city (exampleRoutes.ts): those are
 * one city at a time, and a town's samples would stop them. Kept for this
 * run of the app only: asked again, the API answers at once.
 */
export const SAMPLE_SHAPES: readonly Shape[] = DRAW_ORDER.filter((shape) =>
  EXAMPLE_SHAPES.includes(shape),
);
/** The one a town's card shows, when it is drawn; else the first that is. */
export const SHOWN_SHAPE: Shape = "heart";
/**
 * From one sample asked to the next, at least: twelve a minute, so the
 * eighteen of six towns take a minute and a half. The API
 * takes 30 POSTs a minute from a phone, and a city's examples use up to 18
 * of them (EXAMPLES_PER_MINUTE): «Start» and «Export GPX» keep their room.
 */
export const SAMPLE_GAP_MS = 5000;
/** Before a sample the API did not get is asked once more. */
export const RETRY_MS = 1000;

export type TownSample =
  | { status: "waiting" }
  | { status: "drawing"; route: RecommendedRoute | null }
  | { status: "ready"; route: RecommendedRoute }
  /** Nothing came out here, or the API stopped answering: no drawing. */
  | { status: "failed" };

type Drawn = Partial<Record<Shape, RecommendedRoute | null>>;

// What each town has drawn so far, null for a shape that did not come out.
const drawn = new Map<string, Drawn>();
const samples = new Map<string, TownSample>();
const listeners = new Set<() => void>();
let running: AbortController | null = null;
let lastAsked = 0;
// Counts the changes: what the screen reads to know there is one.
let version = 0;

function show(key: string, sample: TownSample): void {
  samples.set(key, sample);
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** For tests: forgets every town, stops what is drawing. */
export function forgetSamples(): void {
  running?.abort();
  running = null;
  drawn.clear();
  samples.clear();
  lastAsked = 0;
  version += 1;
}

/** A town's sample, as its card shows it now. */
export function townSample(town: Place): TownSample {
  return samples.get(cityKey(town.point)) ?? { status: "waiting" };
}

/** The route a card shows: the heart, or what came out before it. */
function shownRoute(of: Drawn): RecommendedRoute | null {
  return (
    of[SHOWN_SHAPE] ?? SAMPLE_SHAPES.flatMap((shape) => of[shape] ?? []).at(0) ?? null
  );
}

/** The zone or the API is the trouble: the next town would fail the same. */
function stopsAll(outcome: RouteOutcome): boolean {
  return !(
    outcome.kind === "route" ||
    (outcome.kind === "api_error" && outcome.code === "shape_not_drawable")
  );
}

/** Waits `ms`, or until `signal` aborts: it never rejects. */
function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal.addEventListener("abort", done, { once: true });
  });
}

export type SampleOptions = {
  request?: typeof requestRoute;
  gapMs?: number;
  retryMs?: number;
};

/**
 * Draws what `towns` miss, a town after the other, each shape in its turn.
 * It goes on until `stop` is called: the shapes drawn stay, and the next
 * call goes on from them. Trouble that is not a shape's (no network, the
 * zone not downloaded, too many requests) ends it for every town: the
 * cards stay without a drawing, and the next call tries again.
 */
export function drawSamples(
  apiUrl: string,
  towns: readonly Place[],
  {
    request = requestRoute,
    gapMs = SAMPLE_GAP_MS,
    retryMs = RETRY_MS,
  }: SampleOptions = {},
): () => void {
  running?.abort();
  const controller = new AbortController();
  running = controller;
  const { signal } = controller;
  const missing = (key: string) =>
    SAMPLE_SHAPES.filter((shape) => drawn.get(key)?.[shape] === undefined);
  for (const town of towns) {
    const key = cityKey(town.point);
    const route = shownRoute(drawn.get(key) ?? {});
    if (missing(key).length > 0) {
      show(key, route === null ? { status: "waiting" } : { status: "drawing", route });
    }
  }
  void (async () => {
    for (const town of towns) {
      const key = cityKey(town.point);
      for (const shape of missing(key)) {
        const wait = lastAsked + gapMs - Date.now();
        if (wait > 0) {
          await pause(wait, signal);
        }
        if (signal.aborted) {
          return;
        }
        lastAsked = Date.now();
        show(key, { status: "drawing", route: shownRoute(drawn.get(key) ?? {}) });
        const ask = () =>
          request(
            apiUrl,
            // As a city's examples ask it: the API keeps one answer for both.
            {
              shape,
              distance_m: EXAMPLE_DISTANCE_M,
              start: town.point,
              activity: "running",
            },
            { signal },
          );
        let outcome = await ask();
        if (outcome.kind === "unreachable" && !signal.aborted) {
          // Once more: the API closes a connection left idle for 5 s, which
          // is the gap between two samples, and a request sent on it as it
          // closes is lost (seen in the simulator: every sixth).
          await pause(retryMs, signal);
          if (signal.aborted) {
            return;
          }
          outcome = await ask();
        }
        if (signal.aborted || outcome.kind === "cancelled") {
          return;
        }
        if (stopsAll(outcome)) {
          for (const other of towns) {
            const otherKey = cityKey(other.point);
            if (missing(otherKey).length > 0) {
              const route = shownRoute(drawn.get(otherKey) ?? {});
              show(
                otherKey,
                route === null ? { status: "failed" } : { status: "ready", route },
              );
            }
          }
          return;
        }
        drawn.set(key, {
          ...drawn.get(key),
          [shape]:
            outcome.kind === "route"
              ? asRecommended(town, shape, outcome.result).route
              : null,
        });
        // On the card at once: the next shape may wait for its turn.
        show(key, { status: "drawing", route: shownRoute(drawn.get(key) ?? {}) });
      }
      const route = shownRoute(drawn.get(key) ?? {});
      show(key, route === null ? { status: "failed" } : { status: "ready", route });
    }
  })();
  return () => controller.abort();
}

/**
 * The samples of `towns` while they are on the page: they start at once,
 * and stop when the page leaves them, as when one of them is chosen.
 */
export function useNearbySamples(
  apiUrl: string | null,
  towns: readonly Place[],
  options: SampleOptions = {},
): TownSample[] {
  const { request, gapMs } = options;
  const keys = towns.map((town) => cityKey(town.point)).join(" ");
  useEffect(() => {
    if (apiUrl === null || towns.length === 0) {
      return;
    }
    return drawSamples(apiUrl, towns, { request, gapMs });
    // The towns' points are the key: a new array of the same towns is the same.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, keys, request, gapMs]);
  useSyncExternalStore(subscribe, () => version);
  return towns.map(townSample);
}
