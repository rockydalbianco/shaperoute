import { type Activity, type Shape, SHAPES } from "@shaperoute/shared-types";

import { profileOf } from "../sports";
import { APP_DISTANCE_LIMITS_KM } from "./distance";

/**
 * «Surprise me» (TASK-448, ADR-0413; the user's choices of 2026-11-26): a
 * shape and a distance chosen for who does not know what to draw, among
 * those that came out well where they are. This module only chooses what
 * to ask: the route is the engine's, asked as any other by «Draw route».
 *
 * What came out well is what «Explore» already has near the start: the
 * routes of the catalogue, each drawn at 0.90 or more and kept by eye. On
 * foot at 5 or 10 km, never 21 by surprise; by bike the eight shapes of its
 * catalogue at 20, 25 or 30 km. With nothing near, the shapes that come out
 * almost everywhere. No other sport has a catalogue, so none has the pill.
 */

/** A shape and the distance to ask it at, in metres. */
export type SurprisePick = { shape: Shape; distanceM: number };

/** What a route of the catalogue says of itself: a word has no shape. */
export type NearbyRoute = { shape: string | null; distance_m: number };

type SurpriseSport = {
  /** The distances of the catalogue a surprise may ask for. */
  distancesM: readonly number[];
  /** The shapes drawn with nothing near, the same that come out most. */
  spare: readonly Shape[];
  /** The distances of a spare shape. */
  spareDistancesM: readonly number[];
  /** The only shapes it draws by surprise; every shape of the sport when
   * not said. */
  only?: readonly Shape[];
};

/** The shapes of a run kept most often in the catalogue's 63 cities. */
export const SPARE_ON_FOOT: readonly Shape[] = [
  "heart",
  "circle",
  "star",
  "moon",
  "smiley",
  "sun",
  "butterfly",
];

/** The shapes of the catalogue's rides (TASK-441 B2, ADR-0366). */
export const BIKE_SHAPES: readonly Shape[] = [
  "sun",
  "moon",
  "butterfly",
  "heart",
  "star",
  "circle",
  "cat",
  "fish",
];

const ON_FOOT: SurpriseSport = {
  distancesM: [5000, 10000],
  spare: SPARE_ON_FOOT,
  spareDistancesM: [5000, 10000],
};

/** The sports with «Surprise me»: those the catalogue has routes for. A
 * walk is drawn on a run's network, and is shown a run's routes. */
const SURPRISE_SPORTS: Partial<Record<Activity, SurpriseSport>> = {
  running: ON_FOOT,
  walking: ON_FOOT,
  cycling: {
    distancesM: [20000, 25000, 30000],
    spare: BIKE_SHAPES,
    spareDistancesM: [20000],
    only: BIKE_SHAPES,
  },
};

/** True for a sport with «Surprise me». */
export function hasSurprise(activity: Activity): boolean {
  return SURPRISE_SPORTS[activity] !== undefined;
}

/** The distances a surprise may ask for in `activity`; none without it. */
export function surpriseDistancesM(activity: Activity): readonly number[] {
  return SURPRISE_SPORTS[activity]?.distancesM ?? [];
}

export function samePick(a: SurprisePick, b: SurprisePick): boolean {
  return a.shape === b.shape && a.distanceM === b.distanceM;
}

function isShape(name: string | null): name is Shape {
  return name !== null && (SHAPES as readonly string[]).includes(name);
}

/** The shapes `activity` draws by surprise: the sport's own, and of those
 * only the ones its catalogue has. */
function shapesOf(activity: Activity, sport: SurpriseSport): readonly Shape[] {
  const own = profileOf(activity).shapes ?? SHAPES;
  return sport.only === undefined
    ? own
    : own.filter((shape) => sport.only?.includes(shape));
}

/** The distances of `sport` inside what «Draw» offers for `activity`. */
function within(activity: Activity, distancesM: readonly number[]): number[] {
  const [lowest, highest] = APP_DISTANCE_LIMITS_KM[activity];
  return distancesM.filter(
    (metres) => metres >= lowest * 1000 && metres <= highest * 1000,
  );
}

/**
 * The pairs of the routes near that `activity` may be surprised with, each
 * once, in the order first met: a shape of the catalogue the sport draws,
 * at one of its distances. A word, and a run of 21 km, are left out.
 */
export function nearbyPicks(
  activity: Activity,
  nearby: readonly NearbyRoute[],
): SurprisePick[] {
  const sport = SURPRISE_SPORTS[activity];
  if (sport === undefined) {
    return [];
  }
  const shapes = shapesOf(activity, sport);
  const distances = within(activity, sport.distancesM);
  const picks: SurprisePick[] = [];
  for (const route of nearby) {
    const { shape } = route;
    if (
      isShape(shape) &&
      shapes.includes(shape) &&
      distances.includes(route.distance_m)
    ) {
      const pick = { shape, distanceM: route.distance_m };
      if (!picks.some((other) => samePick(other, pick))) {
        picks.push(pick);
      }
    }
  }
  return picks;
}

/** The pairs drawn with nothing near: every spare shape at each of its
 * distances, of those the sport draws and «Draw» offers. */
export function sparePicks(activity: Activity): SurprisePick[] {
  const sport = SURPRISE_SPORTS[activity];
  if (sport === undefined) {
    return [];
  }
  const shapes = shapesOf(activity, sport);
  const distances = within(activity, sport.spareDistancesM);
  return sport.spare
    .filter((shape) => shapes.includes(shape))
    .flatMap((shape) => distances.map((distanceM) => ({ shape, distanceM })));
}

/** One of `items`, by a number from 0 (included) to 1 (not). */
function oneOf<T>(items: readonly T[], random: () => number): T {
  const index = Math.floor(random() * items.length);
  return items[Math.min(Math.max(index, 0), items.length - 1)];
}

/** A pick among `picks`: first the shape, each one alike however many
 * distances it has, then one of its distances. Null with none. */
function pickAmong(
  picks: readonly SurprisePick[],
  previous: SurprisePick | null,
  random: () => number,
): SurprisePick | null {
  // Another shape than the one before, while there is one: the same heart
  // at another distance is no surprise.
  const others =
    previous === null ? picks : picks.filter((pick) => pick.shape !== previous.shape);
  const left =
    others.length > 0
      ? others
      : picks.filter((pick) => previous === null || !samePick(pick, previous));
  if (left.length === 0) {
    return null;
  }
  const shapes = [...new Set(left.map((pick) => pick.shape))];
  const shape = oneOf(shapes, random);
  return oneOf(
    left.filter((pick) => pick.shape === shape),
    random,
  );
}

export type SurpriseAsk = {
  activity: Activity;
  /** The routes of the catalogue near the start; none when it has none, or
   * was not reached. */
  nearby?: readonly NearbyRoute[];
  /** The pick of the tap before: never given again. */
  previous?: SurprisePick | null;
  /** The pairs that came out poorly from here: not offered again. */
  avoid?: readonly SurprisePick[];
  /** A number from 0 (included) to 1 (not): `Math.random`, or one with a
   * seed in a test. */
  random?: () => number;
};

/**
 * The shape and the distance of a tap on «Surprise me»; null for a sport
 * without it. A pair of the routes near, not the one before nor one that
 * came out poorly here; with none left, a spare shape, by the same rules;
 * and when every spare one came out poorly here too, a spare one all the
 * same, other than the one before: the pill always answers.
 */
export function surprisePick({
  activity,
  nearby = [],
  previous = null,
  avoid = [],
  random = Math.random,
}: SurpriseAsk): SurprisePick | null {
  if (!hasSurprise(activity)) {
    return null;
  }
  const good = (picks: SurprisePick[]) =>
    picks.filter((pick) => !avoid.some((poor) => samePick(poor, pick)));
  const spare = sparePicks(activity);
  return (
    pickAmong(good(nearbyPicks(activity, nearby)), previous, random) ??
    pickAmong(good(spare), previous, random) ??
    pickAmong(spare, previous, random)
  );
}
