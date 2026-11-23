import type { Direction, LatLon, WayBack } from "@shaperoute/shared-types";

import type { Language } from "../i18n/languages";
import { wordsOf } from "../voice/words";
import {
  ANNOUNCE_M,
  chainFrom,
  type Cue,
  OFF_FIXES,
  PASS_M,
  POOR_FIX_M,
  type Reading,
} from "./navigator";
import { cumulative, locate, OFF_ROUTE_M } from "./progress";
import { simplifyDirections } from "./simplifyDirections";

/**
 * The way back to the route on the streets, as the run shows it (TASK-314
 * part B, ADR-0274): the way the engine found, where the runner is along it
 * and which of its turns are said. Followed as the route is: a turn said
 * ANNOUNCE_M ahead, passed PASS_M beyond it, left after OFF_FIXES fixes in a
 * row farther than OFF_ROUTE_M from it. Pure, for the screen and the map
 * too; asking for it is `wayBackRun`'s.
 */

export type WayBackShown = {
  points: LatLon[];
  along: number[];
  directions: Direction[];
  /** Metres along the route to where the way reaches it. */
  rejoinAlongM: number;
  /** Metres along the way to the runner's last fix on it. */
  alongM: number;
  /** The next direction of the way; directions.length when none is left. */
  next: number;
  /** Directions up to this index have been said. */
  saidUpTo: number;
  /** Fixes in a row farther than OFF_ROUTE_M from it. */
  leftFixes: number;
};

/** The way as the engine gave it, with `ahead` starting `fromM` metres
 * along the route: nothing run on it yet, nothing said. The turns of a
 * junction crossed on foot are said as one, as along the route (TASK-302). */
export function wayShownOf(way: WayBack, fromM: number): WayBackShown {
  const departure = way.directions[0]?.turn === "depart";
  return {
    points: way.points,
    along: cumulative(way.points),
    directions: simplifyDirections(way.points, way.directions),
    rejoinAlongM: fromM + way.rejoin_m,
    alongM: 0,
    next: departure ? 1 : 0,
    saidUpTo: departure ? 0 : -1,
    leftFixes: 0,
  };
}

/**
 * A fix along the way: where the runner is on it, and the turn to say when
 * it is near. Null once they have left it. A poor fix changes nothing.
 */
export function alongWay(
  shown: WayBackShown,
  fix: LatLon,
  reading: Reading,
  language: Language,
  announceM: number = ANNOUNCE_M,
): { shown: WayBackShown | null; cues: Cue[] } {
  const accuracyM = reading.accuracyM ?? null;
  if (accuracyM !== null && accuracyM > POOR_FIX_M) {
    return { shown, cues: [] };
  }
  const { alongM, offM } = locate(shown.points, shown.along, fix, shown.alongM);
  if (offM > OFF_ROUTE_M) {
    const leftFixes = shown.leftFixes + 1;
    return { shown: leftFixes >= OFF_FIXES ? null : { ...shown, leftFixes }, cues: [] };
  }
  const { directions } = shown;
  let next = shown.next;
  while (next < directions.length && directions[next].distance_m + PASS_M <= alongM) {
    next += 1;
  }
  let saidUpTo = Math.max(shown.saidUpTo, next - 1);
  const cues: Cue[] = [];
  const aheadM = next < directions.length ? directions[next].distance_m - alongM : null;
  if (aheadM !== null && next > saidUpTo && aheadM <= announceM) {
    const chain = chainFrom(directions, next);
    cues.push({ say: wordsOf(language).announcement(chain, aheadM), vibrate: true });
    saidUpTo = next + chain.length - 1;
  }
  return { shown: { ...shown, alongM, next, saidUpTo, leftFixes: 0 }, cues };
}

/**
 * When a way is found: its next turn, said at once with how far it is, so
 * the runner knows where it goes (ADR-0274, «una frase al ricalcolo»). A
 * turn farther than `announceM` is said again when near, as any turn. None
 * when it has no turn left, or that turn is said already.
 */
export function newWayCues(
  shown: WayBackShown,
  language: Language,
  announceM: number = ANNOUNCE_M,
): { shown: WayBackShown; cues: Cue[] } {
  const { directions, next } = shown;
  if (next >= directions.length || next <= shown.saidUpTo) {
    return { shown, cues: [] };
  }
  const chain = chainFrom(directions, next);
  const inM = Math.max(0, directions[next].distance_m - shown.alongM);
  return {
    shown: inM <= announceM ? { ...shown, saidUpTo: next + chain.length - 1 } : shown,
    cues: [{ say: wordsOf(language).announcement(chain, inM), vibrate: false }],
  };
}

/** For the banner: the next turn of the way and how far it is, if any. */
export function upcomingOnWay(
  shown: WayBackShown,
): { direction: Direction; inM: number; then: Direction[] } | null {
  const { directions, next, alongM } = shown;
  if (next >= directions.length) {
    return null;
  }
  const [direction, ...then] = chainFrom(directions, next);
  return { direction, inM: Math.max(0, direction.distance_m - alongM), then };
}

/** For the map: the dots from the runner at `from` to where they are on
 * the way, then along what is left of it. */
export function wayLineFrom(shown: WayBackShown, from: LatLon): LatLon[] {
  const { points, along, alongM } = shown;
  const left = points.filter((_, i) => along[i] > alongM);
  return [from, pointAlong(points, along, alongM), ...left];
}

/** The point `alongM` metres along `points`. */
export function pointAlong(points: LatLon[], along: number[], alongM: number): LatLon {
  for (let i = 1; i < points.length; i += 1) {
    if (along[i] >= alongM) {
      const length = along[i] - along[i - 1];
      const t = length > 0 ? (alongM - along[i - 1]) / length : 0;
      const [lat0, lon0] = points[i - 1];
      const [lat1, lon1] = points[i];
      return [lat0 + t * (lat1 - lat0), lon0 + t * (lon1 - lon0)];
    }
  }
  return points[points.length - 1];
}
