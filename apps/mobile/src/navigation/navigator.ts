import type { Direction, LatLon } from "@shaperoute/shared-types";

import { announcement, instruction } from "./phrases";
import { cumulative, locate, OFF_ROUTE_M } from "./progress";

/**
 * Turn-by-turn along a route that is already drawn (TASK-049, ADR-0052):
 * pure functions from a GPS fix to what the screen shows, what is said and
 * when the phone vibrates. No recalculation: off the route, it says so.
 */

/** A turn is said this far ahead: about 15 s at a running pace. */
export const ANNOUNCE_M = 50;
/** A junction is passed this far beyond it: GPS in a town is 10 m off. */
export const PASS_M = 10;
/** The end of the route is reached this close to it. */
export const ARRIVE_M = 25;

export type Navigation = {
  points: LatLon[];
  along: number[];
  directions: Direction[];
  /** Metres along the route to the last fix placed on it. */
  alongM: number;
  /** The next direction to follow; directions.length when none is left. */
  next: number;
  /** Directions up to this index have been said. */
  saidUpTo: number;
  offRoute: boolean;
  arrived: boolean;
};

/** What to do after a fix: words to say, and whether to vibrate. */
export type Cue = { say: string; vibrate: boolean };

export function startNavigation(
  points: LatLon[],
  directions: Direction[],
): { navigation: Navigation; cues: Cue[] } {
  const departure = directions[0]?.turn === "depart" ? directions[0] : null;
  const navigation: Navigation = {
    points,
    along: cumulative(points),
    directions,
    alongM: 0,
    next: departure ? 1 : 0,
    saidUpTo: departure ? 0 : -1,
    offRoute: false,
    arrived: false,
  };
  return {
    navigation,
    cues: departure ? [{ say: instruction(departure), vibrate: false }] : [],
  };
}

export function onFix(
  navigation: Navigation,
  fix: LatLon,
): { navigation: Navigation; cues: Cue[] } {
  if (navigation.arrived) {
    return { navigation, cues: [] };
  }
  const { alongM, offM } = locate(
    navigation.points,
    navigation.along,
    fix,
    navigation.alongM,
  );
  if (offM > OFF_ROUTE_M) {
    // Where the runner was stays the reference, to find the route again.
    const cues = navigation.offRoute
      ? []
      : [{ say: "You are off the route. Head back to it.", vibrate: true }];
    return { navigation: { ...navigation, offRoute: true }, cues };
  }
  const cues: Cue[] = navigation.offRoute
    ? [{ say: "Back on the route.", vibrate: false }]
    : [];
  const { directions } = navigation;
  let next = navigation.next;
  while (next < directions.length && directions[next].distance_m + PASS_M <= alongM) {
    next += 1;
  }
  let saidUpTo = Math.max(navigation.saidUpTo, next - 1);
  const total = navigation.along[navigation.along.length - 1] ?? 0;
  if (next >= directions.length && total - alongM <= ARRIVE_M) {
    cues.push({ say: "You have arrived.", vibrate: true });
    return {
      navigation: {
        ...navigation,
        alongM,
        next,
        saidUpTo,
        offRoute: false,
        arrived: true,
      },
      cues,
    };
  }
  const aheadM = next < directions.length ? directions[next].distance_m - alongM : null;
  if (aheadM !== null && next > saidUpTo && aheadM <= ANNOUNCE_M) {
    const chain = chainFrom(directions, next);
    cues.push({ say: announcement(chain, aheadM), vibrate: true });
    saidUpTo = next + chain.length - 1;
  }
  return {
    navigation: { ...navigation, alongM, next, saidUpTo, offRoute: false },
    cues,
  };
}

/** The direction at `index` and the ones joined to it (read together). */
export function chainFrom(directions: Direction[], index: number): Direction[] {
  const chain = [directions[index]];
  for (let i = index + 1; i < directions.length && directions[i].joined; i += 1) {
    chain.push(directions[i]);
  }
  return chain;
}

/** For the banner: the next direction and how far it is, if any. */
export function upcoming(
  navigation: Navigation,
): { direction: Direction; inM: number; then: Direction[] } | null {
  const { directions, next, alongM } = navigation;
  if (next >= directions.length) {
    return null;
  }
  const [direction, ...then] = chainFrom(directions, next);
  return { direction, inM: Math.max(0, direction.distance_m - alongM), then };
}

/** Metres left to the end of the route. */
export function remainingM(navigation: Navigation): number {
  const total = navigation.along[navigation.along.length - 1] ?? 0;
  return Math.max(0, total - navigation.alongM);
}
