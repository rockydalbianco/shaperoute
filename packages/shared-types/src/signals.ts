/**
 * POST /signals (TASK-142, ADR-0112): what the app did with a search, for
 * the API's search events (docs/INSIGHTS.md). The bodies are
 * fixtures/signals.json; the API's side is shaperoute_api/signals.py.
 * In a file of its own while TASK-088 changes index.ts: to be exported from
 * there after it.
 */
import type { LatLon, Shape } from "./index.ts";

/** What a route drew: a shape of the catalogue or an image, or a word. */
export type Drawn =
  { shape: Shape | "image"; word?: undefined } | { shape?: undefined; word: string };

/** A city, or a place in one, chosen in "Explore", and how. */
export interface CityChosenSignal {
  kind: "city_chosen";
  /** As /city-suggestions or /cities gave it: a public name. */
  label: string;
  /** Its centre, never the person's start; the API keeps a ~1 km cell. */
  point: LatLon;
  /** A place in a city (TASK-138), not a city. */
  place?: boolean;
  via: "suggestion" | "recent" | "featured" | "typed";
}

/** The route started or exported, among the ones offered (TASK-093). */
export type RouteChosenSignal = Drawn & {
  kind: "route_chosen";
  /** 0 is A, the engine's first. */
  index: number;
  /** Routes offered, 1 to 3. */
  of: number;
  via: "start" | "gpx";
};

/** A way out of a failed route taken (TASK-031): "Try N km", or a shape of
 * the catalogue, which is then the one drawn. Or the "Try N km" of the line
 * under a route done, where its shape comes out better (TASK-234 C,
 * fixtures/signal-better-distance.json): an API before it answers 422,
 * which the app ignores. */
export type HintTakenSignal = Drawn &
  (
    | {
        kind: "hint_taken";
        hint: "try_distance" | "better_distance";
        distance_m: number;
        to_m: number;
      }
    | { kind: "hint_taken"; hint: "catalog_shape"; distance_m: number }
  );

export type Signal = CityChosenSignal | RouteChosenSignal | HintTakenSignal;
