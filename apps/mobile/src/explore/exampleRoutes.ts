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
 * the simplest shapes, the heart the first card, asked one after the other
 * so the first downloads the zone and the others use it. Each opens on the
 * map as a recommended route. Kept in memory and in a file, for the next
 * time.
 */
export const EXAMPLE_SHAPES: readonly Shape[] = ["heart", "circle", "star"];
/**
 * Drawn after those, while they are looked at (TASK-176): the shapes of
 * the catalogue that come out best at this distance from a city's centre
 * (ADR-0144 has the numbers), one at a time as well. One is a card from
 * its turn on, and is left out when it does not come out. A city with
 * recommended routes gets them too: the shapes it has none of, added to
 * its cards.
 */
export const MORE_SHAPES: readonly Shape[] = [
  "moon",
  "horse",
  "snail",
  "dog_head",
  "rabbit_head",
];
const ALL_SHAPES: readonly Shape[] = [...EXAMPLE_SHAPES, ...MORE_SHAPES];
/**
 * The order they are asked in: the circle before the heart, and the moon
 * first of the others. A shape's zone is a square around the centre, as
 * large as the shape reaches, and the API downloads one only when none on
 * its disk holds it: the circle's holds every other, and the moon's those
 * after it. With the heart first, as it was, a city new to the API had a
 * second zone downloaded for the circle, some 30 m larger a side.
 */
export const DRAW_ORDER: readonly Shape[] = ["circle", "heart", "star", ...MORE_SHAPES];
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

/** One of the shapes drawn after the first ones. */
export function isMore(shape: Shape): boolean {
  return !EXAMPLE_SHAPES.includes(shape);
}

/** The first shapes of a city, whatever they are doing. */
export function firstExamples(list: Example[]): Example[] {
  return list.filter((e) => !isMore(e.shape));
}

/**
 * The cards a city shows: its first shapes always; another shape while it
 * is drawn and once it is ready. Waiting it is not announced, and failed
 * it is left out: nobody asked for it.
 */
export function shownExamples(list: Example[]): Example[] {
  return list.filter((e) => !isMore(e.shape) || arrived(e));
}

/**
 * The cards added to a city that has routes of its own: every shape drawn
 * for it, from its turn on, but those the city `has` already.
 */
export function addedExamples(list: Example[], has: readonly string[]): Example[] {
  return list.filter((e) => !has.includes(e.shape) && arrived(e));
}

function arrived(example: Example): boolean {
  return example.status === "drawing" || example.status === "ready";
}

/** The shapes among a city's routes, as the API names them; a word is none. */
export function shapesOf(routes: readonly { shape: string | null }[]): string[] {
  return Array.from(
    new Set(routes.flatMap((r) => (r.shape === null ? [] : [r.shape]))),
  );
}

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

/** The API looked for the shape here and did not find it: so it would again. */
function cannotBeDrawn(outcome: RouteOutcome): boolean {
  return outcome.kind === "api_error" && outcome.code === "shape_not_drawable";
}

// The examples of every city asked in this run of the app, and their routes
// whole, to open. Outside the screen: going to the map stops nothing.
const examples = new Map<string, Example[]>();
const details = new Map<string, ExampleDetail>();
const listeners = new Set<() => void>();
// The other shapes the API could not draw in a city, in this run of the
// app: asked again they would fail the same, at the cost of a whole search.
const leftOut = new Set<string>();
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
  return ALL_SHAPES.map((shape): Example => {
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
  /**
   * The shapes among the city's recommended routes, when it has some
   * (TASK-176): those are not drawn, and the others are drawn as the
   * shapes after the first ones, a card from their turn on and no word
   * when they fail. Without it the city has no routes: the first shapes
   * are its examples, announced at once.
   */
  has?: readonly string[];
};

/**
 * Draws what `city` misses, one shape after the other: the first ones, then
 * the others (TASK-176). Nothing when it is already drawing or every
 * example is ready; another city stops the one drawing. Failed examples are
 * asked again, but for the other shapes the API could not draw.
 */
export function drawExamples(
  apiUrl: string,
  city: Place,
  { request = requestRoute, storage = fileStorage, has }: Options = {},
): void {
  const key = cityKey(city.point);
  if (running?.key === key) {
    return;
  }
  // Nobody waits for these: they fail without a card or a word.
  const quiet = (shape: Shape) => has !== undefined || isMore(shape);
  const before = examples.get(key) ?? fromFile(storage, city, key);
  const list = ALL_SHAPES.flatMap((shape): Example[] => {
    const was = before.find((e) => e.shape === shape);
    if (was?.status === "ready") {
      return [was];
    }
    if (has?.includes(shape)) {
      return [];
    }
    return [
      was !== undefined && leftOut.has(`${key} ${shape}`)
        ? was
        : { shape, status: "waiting" },
    ];
  });
  show(key, list);
  if (list.every((e) => e.status !== "waiting")) {
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
    for (const shape of DRAW_ORDER) {
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
      if (quiet(shape)) {
        if (cannotBeDrawn(outcome)) {
          leftOut.add(`${key} ${shape}`);
          put({ shape, status: "failed", message });
          continue;
        }
        // Trouble that is not this shape's (no network, too many requests):
        // the other shapes are for the next time, and the first stay as
        // they are.
        show(
          key,
          (examples.get(key) ?? []).map((e) =>
            quiet(e.shape) && e.status !== "ready"
              ? { shape: e.shape, status: "failed", message }
              : e,
          ),
        );
        break;
      }
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
  leftOut.clear();
}

/**
 * The shapes drawn for `city` while it is chosen: its examples when it has
 * no recommended routes, or the shapes it does not `has` yet; null without
 * a city. They start at once, and go on when the screen closes.
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
  const { request, storage, has } = options;
  // The same shapes in another array are the same city's routes.
  const hasKey = has?.join(",");
  useEffect(() => {
    if (apiUrl !== null && city !== null) {
      drawExamples(apiUrl, city, { request, storage, has });
    }
    // The city's point is the key: a new label for it changes nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, key, request, storage, hasKey]);
  return {
    examples: list,
    retry: () => {
      if (apiUrl !== null && city !== null) {
        drawExamples(apiUrl, city, { request, storage, has });
      }
    },
  };
}
