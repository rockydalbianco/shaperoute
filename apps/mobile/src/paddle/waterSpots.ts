import type { LatLon } from "@shaperoute/shared-types";

import {
  type ExampleSet,
  MORE_SHAPES,
  PADDLE_EXAMPLES,
} from "../explore/exampleRoutes";
import { metresBetween } from "../map/coordinates";
import beaches from "./beaches.json";
import lakes from "./lakes.json";
import { type WaterKind, WATER_PLACES } from "./waterPlaces";

/**
 * A point on the shore of a lake or of the sea that examples start from
 * (TASK-233): one of the places chosen by hand (WATER_PLACES, with `from`
 * and the examples that come with the app), or a point of the lakes' or of
 * the beaches' list. A long shore has many points under one name.
 */
export type WaterSpot = {
  name: string;
  point: LatLon;
  /** What its examples are drawn at: less than 2 km on a small lake. */
  distance_m: number;
  /** Where on the shore, for a place chosen by hand: an English text to
   * show with `t`. */
  from?: string;
  /** A lake or the sea, for the filter of «LAKES AND SEA» (TASK-269): the
   * list it comes from. A lake when it is not said. */
  kind?: WaterKind;
};

/** A spot and how far it is from where one asks. */
export type SpotAway = { spot: WaterSpot; away_m: number | null };

/** A point of the list this near a place chosen by hand, with its name, is
 * that place: its examples are already in the app. */
const SAME_PLACE_M = 3000;
/** «Near me» is the nearest spot within this; farther, the shapes are asked
 * from the start itself, as before the list. */
export const NEAR_ME_M = 30_000;
/** The spots offered to tap, the nearest first. */
export const SPOTS_SHOWN = 8;
/** The names offered while typing. */
export const SUGGESTIONS_SHOWN = 6;
/** What the examples are drawn at where the list does not say: the start
 * itself, far from every spot. */
export const USUAL_DISTANCE_M = PADDLE_EXAMPLES.distance_m;

const FEATURED: readonly WaterSpot[] = WATER_PLACES.map((place) => ({
  name: place.name,
  point: place.point,
  distance_m: USUAL_DISTANCE_M,
  from: place.from,
  kind: place.kind,
}));

function isSpot(value: unknown): value is WaterSpot {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { name, point, distance_m } = value as Record<string, unknown>;
  return (
    typeof name === "string" &&
    typeof distance_m === "number" &&
    Array.isArray(point) &&
    point.length === 2 &&
    point.every((v) => typeof v === "number")
  );
}

/** The places chosen by hand, then the lakes' list and the beaches', each
 * spot with its kind, without the doubles of the places chosen by hand. */
export function allSpots(
  lakesListed: readonly unknown[],
  beachesListed: readonly unknown[] = [],
): WaterSpot[] {
  const found = [
    ...lakesListed.filter(isSpot).map((spot) => ({ ...spot, kind: "lake" as const })),
    ...beachesListed.filter(isSpot).map((spot) => ({ ...spot, kind: "sea" as const })),
  ].filter(
    (lake) =>
      !FEATURED.some(
        (place) =>
          place.name === lake.name &&
          metresBetween(place.point, lake.point) < SAME_PLACE_M,
      ),
  );
  return [...FEATURED, ...found];
}

/** Every spot of «Explore» with «Paddle». The lakes are written by `python
 * -m shaperoute_api.lake_catalog` (TASK-233), the beaches by
 * `shaperoute_api.beach_catalog` (TASK-245): a seaside place has one point,
 * on its shore. */
export const WATER_SPOTS: readonly WaterSpot[] = allSpots(lakes.lakes, beaches.beaches);

/** A lake or the sea: a spot that does not say is a lake. */
export function kindOf(spot: WaterSpot): WaterKind {
  return spot.kind ?? "lake";
}

/**
 * One spot a name: the nearest to `from`, the nearest name first. Without
 * `from`, the first of each name, as listed: the places chosen by hand
 * come first.
 */
export function byName(spots: readonly WaterSpot[], from: LatLon | null): SpotAway[] {
  const best = new Map<string, SpotAway>();
  for (const spot of spots) {
    const away_m = from === null ? null : metresBetween(from, spot.point);
    const had = best.get(spot.name);
    if (
      had === undefined ||
      (away_m !== null && had.away_m !== null && away_m < had.away_m)
    ) {
      best.set(spot.name, { spot, away_m });
    }
  }
  const found = Array.from(best.values());
  return from === null
    ? found
    : found.sort((a, b) => (a.away_m ?? 0) - (b.away_m ?? 0));
}

/** Lower case, without accents: «cà» is found by «ca». */
function plain(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * The names that have every word typed, a word of the name beginning with
 * it: «lev» and «lago lev» find «Lago di Levico». The nearest first.
 */
export function searchSpots(
  spots: readonly WaterSpot[],
  query: string,
  from: LatLon | null,
): SpotAway[] {
  const typed = plain(query).split(/\s+/).filter(Boolean);
  if (typed.length === 0) {
    return [];
  }
  return byName(spots, from).filter(({ spot }) => {
    const words = plain(spot.name).split(/[\s'’-]+/);
    return typed.every((part) => words.some((word) => word.startsWith(part)));
  });
}

/** The spot «Near me» shows: the nearest, when it is near enough. */
export function nearestSpot(
  spots: readonly WaterSpot[],
  from: LatLon,
): SpotAway | null {
  const [first] = byName(spots, from);
  return first !== undefined && (first.away_m ?? Infinity) <= NEAR_ME_M ? first : null;
}

const sets = new Map<number, ExampleSet>([[USUAL_DISTANCE_M, PADDLE_EXAMPLES]]);

/** The examples of a spot drawn at `distance_m`: the app's at 2 km, and a
 * set of its own for each smaller distance, kept apart by its key. */
export function examplesAt(distance_m: number): ExampleSet {
  let set = sets.get(distance_m);
  if (set === undefined) {
    set = {
      activity: "paddling",
      distance_m,
      more: MORE_SHAPES,
      prefix: `paddling:${distance_m}:`,
    };
    sets.set(distance_m, set);
  }
  return set;
}
