import type {
  Activity,
  LatLon,
  RouteRequest,
  RouteResult,
  Shape,
} from "@shaperoute/shared-types";
import { File, Paths } from "expo-file-system";
import { useEffect, useSyncExternalStore } from "react";

import { requestRoute, type RouteOutcome } from "../api/routes";
import { metresBetween } from "../map/coordinates";
import { readAheadFile } from "../paddle/aheadStore";
import paddleExamples from "../paddle/paddleExamples.json";
import type { Place } from "../places/photon";
import { shapeAsked } from "../route/penUpShapes";
import { problemText } from "../route/problems";
import { walksOf } from "../route/walks";
import { cityShort } from "./presets";
import {
  isRecommendedDetail,
  type RecommendedRoute,
  type RecommendedRouteDetail,
  turnOf,
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

/**
 * What a place's examples are drawn for (TASK-191): a run's from a city's
 * centre, or paddling's from a point on the shore of a lake or the sea,
 * 2 km; the first shapes and then the others, for both (TASK-227, the
 * user's choice). Each set keeps its examples apart from the other's, the
 * same point too: `prefix` comes before the place's key.
 */
export type ExampleSet = {
  activity: Activity;
  distance_m: number;
  /** The shapes after the first ones. */
  more: readonly Shape[];
  prefix: string;
  /**
   * Examples that come with the app, drawn before it was built, by key
   * (TASK-227): ready at once, without the network, and never asked again.
   * Read before the file of the phone.
   */
  bundled?: Readonly<Record<string, ExampleDetail[]>>;
};

export const RUN_EXAMPLES: ExampleSet = {
  activity: "running",
  distance_m: EXAMPLE_DISTANCE_M,
  more: MORE_SHAPES,
  prefix: "",
};

/**
 * On the water, the shapes of the run (TASK-227, the user's choice: the
 * samples judged fit on the four places). The places of «Explore» come with
 * the app (paddleExamples.json, written by `python -m
 * shaperoute_api.paddle_examples`, which says the engine it was drawn by);
 * «Near me» is drawn as a run's examples.
 */
export const PADDLE_EXAMPLES: ExampleSet = {
  activity: "paddling",
  distance_m: 2000,
  more: MORE_SHAPES,
  prefix: "paddling:",
  bundled: readKept(paddleExamples.examples),
};

/**
 * How a set asks for `shape`. On the water a shape in pieces is drawn piece
 * by piece, the pen up between them, as «Draw» asks for it (TASK-226); a
 * run's examples are drawn in one line, as they always were.
 */
function shapeOf(shape: Shape, set: ExampleSet): ReturnType<typeof shapeAsked> {
  return set.activity === "paddling" ? shapeAsked(shape, true, "paddling") : { shape };
}

/** What a set asks the API for `shape` from `city`: an example's request. */
export function requestOf(city: Place, shape: Shape, set: ExampleSet): RouteRequest {
  return {
    ...shapeOf(shape, set),
    distance_m: set.distance_m,
    start: city.point,
    activity: set.activity,
  };
}

/** A set's shapes, as its cards show them: the heart first. */
function setShapes(set: ExampleSet): readonly Shape[] {
  return [...EXAMPLE_SHAPES, ...set.more];
}

/** Every shape of `set` at `key` came with the app: nothing to ask. */
function comesWithTheApp(set: ExampleSet, key: string): boolean {
  const bundled = set.bundled?.[key] ?? [];
  return setShapes(set).every((shape) => bundled.some((d) => d.shape === shape));
}

/** A set's shapes, in the order they are asked (DRAW_ORDER). */
export function drawOrderOf(set: ExampleSet): readonly Shape[] {
  return DRAW_ORDER.filter((shape) => !isMore(shape) || set.more.includes(shape));
}
/**
 * The API takes 30 POSTs a minute from a phone (ADR-0076), and a city it
 * has already drawn answers its eight at once: three such cities in a
 * minute would use them all, and "Start" or "Export GPX" would be refused.
 * So the other shapes are asked only while fewer example requests than this
 * went out in the last minute, the first shapes counted; past that they
 * wait. The first shapes never wait: they cost what they always did.
 */
export const EXAMPLES_PER_MINUTE = 18;
const MINUTE_MS = 60_000;
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
  /**
   * On the water, where the engine placed the shape (RouteResult.centre):
   * what «Move the shape» moves (TASK-244). An example kept before it, or
   * drawn by an API older than TASK-238, has none and is not moved.
   */
  centre?: LatLon;
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

/** The key of a place's examples in a set: a run's is the city's key. */
export function examplesKey(point: LatLon, set: ExampleSet = RUN_EXAMPLES): string {
  return `${set.prefix}${cityKey(point)}`;
}

/** Every `step`-th point and the last: the line's look, a few points. */
export function thinned(points: LatLon[], most: number = PREVIEW_POINTS): LatLon[] {
  if (points.length <= most) {
    return points;
  }
  const step = (points.length - 1) / (most - 1);
  return Array.from({ length: most }, (_, i) => points[Math.round(i * step)]);
}

/** A planned route as one of the list, and whole: it opens like one. An
 * example that is not a run says its activity (TASK-191). */
export function asRecommended(
  city: Place,
  shape: Shape,
  result: RouteResult,
  set: ExampleSet = RUN_EXAMPLES,
): { route: RecommendedRoute; detail: ExampleDetail } {
  const id = `${ID_PREFIX}${shape}:${examplesKey(city.point, set)}`;
  const name = cityShort(city.label);
  const whole = (of: RouteResult, routeId: string): RecommendedRouteDetail => ({
    id: routeId,
    city: name,
    shape,
    word: null,
    style: null,
    distance_m: set.distance_m,
    route_m: of.distance_m,
    similarity: of.similarity,
    points: of.points,
    license: LICENSE,
    ...(set.activity === "running" ? {} : { activity: set.activity }),
    ...penUp(of),
    // Turned to follow the roads or the shore: its card and its map turn
    // back (TASK-232). Each alternative has its own.
    ...turnOf(of),
  });
  const { points, license, walks, ...common } = whole(result, id);
  return {
    route: {
      ...common,
      start: points[0],
      away_m: metresBetween(city.point, points[0]),
      ...previewOf(points, walks),
    },
    detail: {
      ...common,
      points,
      license,
      ...(walks !== undefined ? { walks } : {}),
      ...(result.centre ? { centre: result.centre } : {}),
      // B, C: the routes the engine found besides its own (TASK-093).
      alternatives: (result.alternatives ?? []).map((other, i) =>
        whole(other, `${id}:${i + 1}`),
      ),
    },
  };
}

/**
 * An example with its route drawn again, its shape moved (TASK-244): what
 * the engine answered in place of its line, the rest as it was. Only for
 * the map it is open on: the list keeps the example as it was drawn.
 */
export function movedExample(
  detail: ExampleDetail,
  result: RouteResult,
): ExampleDetail {
  const { id, city, shape, word, style, distance_m, license, activity } = detail;
  return {
    id,
    city,
    shape,
    word,
    style,
    distance_m,
    route_m: result.distance_m,
    similarity: result.similarity,
    points: result.points,
    license,
    ...(activity !== undefined ? { activity } : {}),
    ...penUp(result),
    ...turnOf(result),
    ...(result.centre ? { centre: result.centre } : {}),
    alternatives: [],
  };
}

/**
 * The line a card draws for a route: a few of its points, or, drawn in
 * pieces, all of them with the points the pen comes to without drawing
 * (`gaps`): thinned, a walk would fall between two points kept (TASK-226).
 */
function previewOf(
  points: LatLon[],
  walks: readonly (readonly [number, number])[] | undefined,
): Pick<RecommendedRoute, "preview" | "gaps"> {
  if (walks === undefined || walks.length === 0) {
    return { preview: thinned(points) };
  }
  const gaps = walks.flatMap(([from, to]) =>
    Array.from({ length: to - from }, (_, i) => from + 1 + i),
  );
  return { preview: points, gaps };
}

/** The stretches with the pen up of a planned route, when it has some: a
 * shape drawn in pieces on the water (TASK-226). */
function penUp(result: RouteResult): Pick<RecommendedRouteDetail, "walks"> {
  const walks = walksOf(result.points, result.walks);
  return walks.length > 0 ? { walks: walks.map(([from, to]) => [from, to]) } : {};
}

/** What a card says when its route could not be drawn: on the water in the
 * water's words (TASK-191). */
export function failureText(
  outcome: RouteOutcome,
  activity: Activity = "running",
): string {
  if (outcome.kind === "route" || outcome.kind === "cancelled") {
    return "";
  }
  return problemText(outcome, "shape", activity).text;
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
// How each was asked, to ask for it again with its shape moved (TASK-244).
const asked = new Map<string, RouteRequest>();
const listeners = new Set<() => void>();
// The other shapes the API could not draw in a city, in this run of the
// app: asked again they would fail the same, at the cost of a whole search.
const leftOut = new Set<string>();
// When each example of the last minute was asked, the oldest first.
const sent: number[] = [];

/** How long before another of the other shapes may be asked; 0 when now. */
export function moreWaitMs(now: number): number {
  while (sent.length > 0 && sent[0] <= now - MINUTE_MS) {
    sent.shift();
  }
  return sent.length < EXAMPLES_PER_MINUTE
    ? 0
    : sent[sent.length - EXAMPLES_PER_MINUTE] + MINUTE_MS - now;
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

/**
 * The request a ready example was drawn for: from its place, not from where
 * its route begins, so the API reads the same zone or water again.
 */
export function exampleRequest(id: string): RouteRequest | undefined {
  return asked.get(id);
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
      kept[key] = list
        .filter(isRecommendedDetail)
        .map(readAlternatives)
        .map(readCentre)
        .map(readTurn);
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

/** A centre that does not read is as none kept: the example is not moved. */
function readCentre(detail: ExampleDetail): ExampleDetail {
  const { centre, ...route } = detail;
  return centre === undefined || isPoint(centre) ? detail : route;
}

/** A turn that does not read is as none kept: the route stays north up. */
function upright<T extends RecommendedRouteDetail>(route: T): T {
  if (route.rotation_deg === undefined || turnOf(route).rotation_deg !== undefined) {
    return route;
  }
  const read = { ...route };
  delete read.rotation_deg;
  return read;
}

/** The same for an example and for each of its alternatives. */
function readTurn(detail: ExampleDetail): ExampleDetail {
  const read = upright(detail);
  return read.alternatives === undefined
    ? read
    : { ...read, alternatives: read.alternatives.map(upright) };
}

function isPoint(value: unknown): value is LatLon {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((n) => typeof n === "number" && Number.isFinite(n))
  );
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
function fromFile(
  storage: Storage,
  city: Place,
  key: string,
  set: ExampleSet,
): Example[] {
  // What came with the app first, then what the phone drew ahead of the
  // page (TASK-246): the phone's file is for the rest.
  const saved = [
    ...(set.bundled?.[key] ?? []),
    ...(set.activity === "paddling"
      ? (readKept({ [key]: readAheadFile().examples[key] })[key] ?? [])
      : []),
    ...(storage.load()[key] ?? []),
  ];
  return setShapes(set).map((shape): Example => {
    const detail = saved.find((d) => d.shape === shape);
    if (
      detail === undefined ||
      detail.alternatives === undefined ||
      // Kept in one line before the pieces (TASK-226): drawn again.
      ("pen_up" in shapeOf(shape, set) && detail.walks === undefined)
    ) {
      return { shape, status: "waiting" };
    }
    details.set(detail.id, detail);
    asked.set(detail.id, requestOf(city, shape, set));
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
      ...previewOf(detail.points, walksOf(detail.points, detail.walks)),
      ...turnOf(detail),
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
  /** What the examples are for: a run's unless said (TASK-191). */
  set?: ExampleSet;
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
  {
    request = requestRoute,
    storage = fileStorage,
    has,
    set = RUN_EXAMPLES,
  }: Options = {},
): void {
  const key = examplesKey(city.point, set);
  if (running?.key === key) {
    return;
  }
  // Nobody waits for these: they fail without a card or a word.
  const quiet = (shape: Shape) => has !== undefined || isMore(shape);
  const before = examples.get(key) ?? fromFile(storage, city, key, set);
  const list = setShapes(set).flatMap((shape): Example[] => {
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
    for (const shape of drawOrderOf(set)) {
      const now = examples.get(key) ?? [];
      if (now.find((e) => e.shape === shape)?.status !== "waiting") {
        continue;
      }
      const put = (example: Example) =>
        show(
          key,
          (examples.get(key) ?? []).map((e) => (e.shape === shape ? example : e)),
        );
      if (quiet(shape)) {
        // No card yet while it waits for the minute's allowance.
        for (
          let wait = moreWaitMs(Date.now());
          wait > 0;
          wait = moreWaitMs(Date.now())
        ) {
          await pause(wait, controller.signal);
          if (controller.signal.aborted) {
            return;
          }
        }
      }
      sent.push(Date.now());
      put({ shape, status: "drawing" });
      const outcome = await request(apiUrl, requestOf(city, shape, set), {
        signal: controller.signal,
      });
      if (controller.signal.aborted || outcome.kind === "cancelled") {
        return;
      }
      if (outcome.kind === "route") {
        const { route, detail } = asRecommended(city, shape, outcome.result, set);
        details.set(detail.id, detail);
        asked.set(detail.id, requestOf(city, shape, set));
        put({ shape, status: "ready", route });
        keep(storage, key, examples.get(key) ?? []);
        continue;
      }
      const message = failureText(outcome, set.activity);
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
  asked.clear();
  leftOut.clear();
  sent.length = 0;
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
  const { request, storage, has, set } = options;
  const key = city === null ? null : examplesKey(city.point, set);
  const list = useSyncExternalStore(subscribe, () =>
    key === null ? null : (examples.get(key) ?? null),
  );
  // The same shapes in another array are the same city's routes.
  const hasKey = has?.join(",");
  useEffect(() => {
    if (city === null) {
      return;
    }
    if (apiUrl !== null) {
      drawExamples(apiUrl, city, { request, storage, has, set });
    } else if (key !== null && set !== undefined && comesWithTheApp(set, key)) {
      // Nothing to ask: they show without an API.
      drawExamples("", city, { request, storage, has, set });
    }
    // The city's point and the set are the key: a new label changes nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, key, request, storage, hasKey]);
  return {
    examples: list,
    retry: () => {
      if (apiUrl !== null && city !== null) {
        drawExamples(apiUrl, city, { request, storage, has, set });
      }
    },
  };
}
