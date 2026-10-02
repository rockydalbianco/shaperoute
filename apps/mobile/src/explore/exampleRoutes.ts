import type { LatLon, RouteResult, Shape } from "@shaperoute/shared-types";
import { File, Paths } from "expo-file-system";
import { useEffect, useSyncExternalStore } from "react";

import { requestRoute, type RouteOutcome } from "../api/routes";
import { metresBetween } from "../map/coordinates";
import type { Place } from "../places/photon";
import { problemText } from "../route/problems";
import { cityShort } from "./presets";
import {
  isRecommendedDetail,
  type RecommendedRoute,
  type RecommendedRouteDetail,
} from "./recommendedRoutes";

/**
 * Examples drawn at once for a city without recommended routes (TASK-143):
 * the simplest shapes, the heart first, asked one after the other so the
 * first downloads the zone and the others use it. Each opens on the map as
 * a recommended route. Kept in memory and in a file, for the next time.
 */
export const EXAMPLE_SHAPES: readonly Shape[] = ["heart", "circle", "star"];
/** Short: the quickest to plan, and the smallest zone to download. */
export const EXAMPLE_DISTANCE_M = 5000;
/** The cities whose examples the file keeps, the last first. */
export const MAX_KEPT_CITIES = 8;
export const EXAMPLES_FILE = "city-examples.json";
const ID_PREFIX = "example:";
/** Points of the thumbnail: as light as the list's previews. */
const PREVIEW_POINTS = 60;
const LICENSE =
  "Routes on OpenStreetMap data, (c) OpenStreetMap contributors, ODbL 1.0: https://www.openstreetmap.org/copyright";

/**
 * An example whole, with the other routes to choose from (TASK-151): the
 * API's alternatives, each a whole route. Without the field the example was
 * kept before them, and is drawn again.
 */
export type ExampleDetail = RecommendedRouteDetail & {
  alternatives?: RecommendedRouteDetail[];
};

export type Example =
  | { shape: Shape; status: "waiting" }
  | { shape: Shape; status: "drawing" }
  | { shape: Shape; status: "ready"; route: RecommendedRoute }
  | { shape: Shape; status: "failed"; message: string };

/** One city's examples: the same point, the same examples. */
export function cityKey(point: LatLon): string {
  return `${point[0].toFixed(4)},${point[1].toFixed(4)}`;
}

/** Every `step`-th point and the last: the line's look, a few points. */
export function thinned(points: LatLon[], most: number = PREVIEW_POINTS): LatLon[] {
  if (points.length <= most) {
    return points;
  }
  const step = (points.length - 1) / (most - 1);
  return Array.from({ length: most }, (_, i) => points[Math.round(i * step)]);
}

/** A planned route as one of the list, and whole: it opens like one. */
export function asRecommended(
  city: Place,
  shape: Shape,
  result: RouteResult,
): { route: RecommendedRoute; detail: ExampleDetail } {
  const id = `${ID_PREFIX}${shape}:${cityKey(city.point)}`;
  const name = cityShort(city.label);
  const whole = (of: RouteResult, routeId: string): RecommendedRouteDetail => ({
    id: routeId,
    city: name,
    shape,
    word: null,
    style: null,
    distance_m: EXAMPLE_DISTANCE_M,
    route_m: of.distance_m,
    similarity: of.similarity,
    points: of.points,
    license: LICENSE,
  });
  const { points, license, ...common } = whole(result, id);
  return {
    route: {
      ...common,
      start: points[0],
      away_m: metresBetween(city.point, points[0]),
      preview: thinned(points),
    },
    detail: {
      ...common,
      points,
      license,
      // B, C: the routes the engine found besides its own (TASK-093).
      alternatives: (result.alternatives ?? []).map((other, i) =>
        whole(other, `${id}:${i + 1}`),
      ),
    },
  };
}

/** What a card says when its route could not be drawn. */
export function failureText(outcome: RouteOutcome): string {
  if (outcome.kind === "route" || outcome.kind === "cancelled") {
    return "";
  }
  return problemText(outcome).text;
}

/** No other shape will do better: the zone or the API is the trouble. */
function stopsAll(outcome: RouteOutcome): boolean {
  return (
    outcome.kind === "unreachable" ||
    (outcome.kind === "api_error" && outcome.code === "map_data_unavailable")
  );
}

// The examples of every city asked in this run of the app, and their routes
// whole, to open. Outside the screen: going to the map stops nothing.
const examples = new Map<string, Example[]>();
const details = new Map<string, ExampleDetail>();
const listeners = new Set<() => void>();
let running: { key: string; controller: AbortController } | null = null;

function show(key: string, list: Example[]): void {
  examples.set(key, list);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The route whole of a ready example, to open without asking the API. */
export function exampleDetail(id: string): ExampleDetail | undefined {
  return details.get(id);
}

export type Storage = {
  load: () => Record<string, ExampleDetail[]>;
  save: (kept: Record<string, ExampleDetail[]>) => void;
};

/** The file in the app's documents, as the recent cities (recentCities.ts). */
export const fileStorage: Storage = {
  load() {
    try {
      const file = new File(Paths.document, EXAMPLES_FILE);
      if (!file.exists) {
        return {};
      }
      const data: unknown = JSON.parse(file.textSync());
      return readKept(data);
    } catch {
      return {};
    }
  },
  save(kept) {
    try {
      const file = new File(Paths.document, EXAMPLES_FILE);
      file.create({ overwrite: true });
      file.write(JSON.stringify(kept));
    } catch {
      // A convenience: without the file the examples are drawn again.
    }
  },
};

/** The file's routes, checked one by one: what does not read is dropped. */
export function readKept(data: unknown): Record<string, ExampleDetail[]> {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return {};
  }
  const kept: Record<string, ExampleDetail[]> = {};
  for (const [key, list] of Object.entries(data)) {
    if (Array.isArray(list)) {
      kept[key] = list.filter(isRecommendedDetail).map(readAlternatives);
    }
  }
  return kept;
}

/** Alternatives that do not read are as none kept: the example is drawn again. */
function readAlternatives(detail: ExampleDetail): ExampleDetail {
  const { alternatives, ...route } = detail;
  return Array.isArray(alternatives) && alternatives.every(isRecommendedDetail)
    ? detail
    : route;
}

/** `city`'s routes first in the file, the oldest cities out. */
function keep(storage: Storage, key: string, list: Example[]): void {
  const ready = list.flatMap((e) => {
    const detail = e.status === "ready" ? details.get(e.route.id) : undefined;
    return detail === undefined ? [] : [detail];
  });
  const kept = storage.load();
  delete kept[key];
  const order = [key, ...Object.keys(kept)].slice(0, MAX_KEPT_CITIES);
  const next: Record<string, ExampleDetail[]> = {};
  for (const k of order) {
    next[k] = k === key ? ready : kept[k];
  }
  storage.save(next);
}

/**
 * The examples the file had for this city, as ready cards. One kept before
 * the alternatives (TASK-151) is drawn again, to have them.
 */
function fromFile(storage: Storage, city: Place, key: string): Example[] {
  const saved = storage.load()[key] ?? [];
  return EXAMPLE_SHAPES.map((shape): Example => {
    const detail = saved.find((d) => d.shape === shape);
    if (detail === undefined || detail.alternatives === undefined) {
      return { shape, status: "waiting" };
    }
    details.set(detail.id, detail);
    const { id, city: name, word, style, distance_m, route_m, similarity } = detail;
    const route: RecommendedRoute = {
      id,
      city: name,
      shape,
      word,
      style,
      distance_m,
      route_m,
      similarity,
      start: detail.points[0],
      away_m: metresBetween(city.point, detail.points[0]),
      preview: thinned(detail.points),
    };
    return { shape, status: "ready", route };
  });
}

type Options = {
  request?: typeof requestRoute;
  storage?: Storage;
};

/**
 * Draws what `city` misses, one shape after the other. Nothing when it is
 * already drawing or every example is ready; another city stops the one
 * drawing. Failed examples are asked again.
 */
export function drawExamples(
  apiUrl: string,
  city: Place,
  { request = requestRoute, storage = fileStorage }: Options = {},
): void {
  const key = cityKey(city.point);
  if (running?.key === key) {
    return;
  }
  let list = examples.get(key) ?? fromFile(storage, city, key);
  list = list.map((e) =>
    e.status === "ready" ? e : { shape: e.shape, status: "waiting" },
  );
  show(key, list);
  if (list.every((e) => e.status === "ready")) {
    return;
  }
  if (running !== null) {
    const stopped = running.key;
    running.controller.abort();
    const left = examples.get(stopped) ?? [];
    show(
      stopped,
      left.map((e) =>
        e.status === "drawing" ? { shape: e.shape, status: "waiting" } : e,
      ),
    );
  }
  const controller = new AbortController();
  running = { key, controller };
  void (async () => {
    for (const shape of EXAMPLE_SHAPES) {
      const now = examples.get(key) ?? [];
      if (now.find((e) => e.shape === shape)?.status !== "waiting") {
        continue;
      }
      const put = (example: Example) =>
        show(
          key,
          (examples.get(key) ?? []).map((e) => (e.shape === shape ? example : e)),
        );
      put({ shape, status: "drawing" });
      const outcome = await request(
        apiUrl,
        {
          shape,
          distance_m: EXAMPLE_DISTANCE_M,
          start: city.point,
          activity: "running",
        },
        { signal: controller.signal },
      );
      if (controller.signal.aborted || outcome.kind === "cancelled") {
        return;
      }
      if (outcome.kind === "route") {
        const { route, detail } = asRecommended(city, shape, outcome.result);
        details.set(detail.id, detail);
        put({ shape, status: "ready", route });
        keep(storage, key, examples.get(key) ?? []);
        continue;
      }
      const message = failureText(outcome);
      if (stopsAll(outcome)) {
        show(
          key,
          (examples.get(key) ?? []).map((e) =>
            e.status === "ready" ? e : { shape: e.shape, status: "failed", message },
          ),
        );
        break;
      }
      put({ shape, status: "failed", message });
    }
    if (running?.key === key) {
      running = null;
    }
  })();
}

/** For tests: forgets every city, stops what is drawing. */
export function forgetExamples(): void {
  running?.controller.abort();
  running = null;
  examples.clear();
  details.clear();
}

/**
 * The examples of `city` while it is chosen and has no recommended routes;
 * null otherwise. They start at once, and go on when the screen closes.
 */
export function useCityExamples(
  apiUrl: string | null,
  city: Place | null,
  options: Options = {},
): { examples: Example[] | null; retry: () => void } {
  const key = city === null ? null : cityKey(city.point);
  const list = useSyncExternalStore(subscribe, () =>
    key === null ? null : (examples.get(key) ?? null),
  );
  const { request, storage } = options;
  useEffect(() => {
    if (apiUrl !== null && city !== null) {
      drawExamples(apiUrl, city, { request, storage });
    }
    // The city's point is the key: a new label for it changes nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, key, request, storage]);
  return {
    examples: list,
    retry: () => {
      if (apiUrl !== null && city !== null) {
        drawExamples(apiUrl, city, { request, storage });
      }
    },
  };
}
