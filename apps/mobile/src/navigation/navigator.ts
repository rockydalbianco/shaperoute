import type { Direction, LatLon } from "@shaperoute/shared-types";

import { BASE_LANGUAGE, type Language } from "../i18n/languages";
import { wordsOf } from "../voice/words";
import { cumulative, locate, OFF_ROUTE_M } from "./progress";

/**
 * Turn-by-turn along a route that is already drawn (TASK-049, ADR-0052):
 * pure functions from a GPS fix to what the screen shows, what is said and
 * when the phone vibrates. No recalculation: off the route, it says so.
 * What is said is in the voice's `language` (TASK-209), English unless
 * another is given.
 */

/** A turn is said this far ahead: about 15 s at a running pace. */
export const ANNOUNCE_M = 50;
/** A junction is passed this far beyond it: GPS in a town is 10 m off. */
export const PASS_M = 10;
/** The end of the route is reached this close to it. */
export const ARRIVE_M = 25;
/** And only after this many fixes in a row there, none of them poor
 * (TASK-253): arriving ends the recording for good, so one stray fix on
 * the end of a route that passes near its own end must not do it. */
export const ARRIVE_FIXES = 2;
/**
 * Off the route is said only after this many fixes in a row beyond
 * OFF_ROUTE_M, lasting OFF_SECONDS (TASK-074, ADR-0070): a GPS in a town
 * strays for a few seconds, a wrong street does not come back.
 */
export const OFF_FIXES = 3;
export const OFF_SECONDS = 8;
/** Back on the route after this many fixes in a row on it. */
export const BACK_FIXES = 2;
/** A fix less accurate than this, in metres, says nothing about being off. */
export const POOR_FIX_M = 40;
/**
 * No fix for this long, in milliseconds, is a gap (TASK-270): the app
 * was behind another, frozen by the phone, or closed, and the runner may
 * have gone on further than `locate` looks. Until the runner is placed on
 * the route again, a fix off it is looked for along all the route ahead,
 * and taken after BACK_FIXES fixes in a row there. Standing at a light
 * gives no fixes either: the runner is then found where they stopped.
 */
export const GAP_MS = 20_000;

/** What the phone says about a fix besides where it is. */
export type Reading = {
  /** Radius of the fix's error, in metres, when the phone gives it. */
  accuracyM?: number | null;
  /** When the fix was taken, in milliseconds. */
  timeMs?: number | null;
};

/** Fixes in a row beyond OFF_ROUTE_M, not yet said. */
type OffStreak = { fixes: number; sinceMs: number | null };

/** After a gap, where on the route ahead the fixes were placed, and how
 * many in a row. */
type Found = { alongM: number; fixes: number };

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
  /** Fixes beyond OFF_ROUTE_M while still on the route; null when none. */
  offStreak: OffStreak | null;
  /** Fixes on the route in a row while off it. */
  backFixes: number;
  /** Fixes in a row at the end of the route; absent before TASK-253. */
  endFixes?: number;
  /** When the last fix was taken, if the phone said; absent before
   * TASK-270. */
  lastFixMs?: number | null;
  /** A gap was seen and the runner is not placed on the route since: a
   * fix is looked for along all the route ahead (GAP_MS). */
  lost?: boolean;
  /** Fixes placed beyond where `locate` looks, while `lost`; null when
   * none. */
  found?: Found | null;
  arrived: boolean;
  /** How far ahead a turn is said: ANNOUNCE_M when absent, further on a
   * bike (TASK-216, `ride.ts`). */
  announceM?: number;
};

/** What to do after a fix: words to say, and whether to vibrate. */
export type Cue = { say: string; vibrate: boolean };

export function startNavigation(
  points: LatLon[],
  directions: Direction[],
  language: Language = BASE_LANGUAGE,
  announceM: number = ANNOUNCE_M,
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
    offStreak: null,
    backFixes: 0,
    arrived: false,
    announceM,
  };
  return {
    navigation,
    cues: departure
      ? [{ say: wordsOf(language).direction(departure), vibrate: false }]
      : [],
  };
}

export function onFix(
  navigation: Navigation,
  fix: LatLon,
  reading: Reading = {},
  language: Language = BASE_LANGUAGE,
): { navigation: Navigation; cues: Cue[] } {
  const words = wordsOf(language);
  if (navigation.arrived) {
    return { navigation, cues: [] };
  }
  const accuracyM = reading.accuracyM ?? null;
  const poor = accuracyM !== null && accuracyM > POOR_FIX_M;
  const timeMs = reading.timeMs ?? null;
  let { alongM, offM } = locate(
    navigation.points,
    navigation.along,
    fix,
    navigation.alongM,
  );
  // After a gap the runner may be anywhere ahead (TASK-270).
  const lost = navigation.lost === true || gapBefore(navigation, timeMs);
  let found: Found | null = null;
  if (offM > OFF_ROUTE_M && lost) {
    // A poor fix neither ends nor extends the fixes found ahead.
    found = poor ? (navigation.found ?? null) : foundAhead(navigation, fix);
  }
  const rejoined = found !== null && found.fixes >= BACK_FIXES;
  if (found !== null && rejoined) {
    alongM = found.alongM;
    offM = 0;
  }
  // What this fix changes, whatever it says about the route.
  const seen: Navigation = {
    ...navigation,
    lastFixMs: timeMs ?? navigation.lastFixMs ?? null,
    lost,
    found,
  };
  if (offM > OFF_ROUTE_M) {
    // Where the runner was stays the reference, to find the route again.
    if (poor) {
      return { navigation: seen, cues: [] };
    }
    if (navigation.offRoute) {
      return { navigation: { ...seen, backFixes: 0 }, cues: [] };
    }
    const streak: OffStreak = {
      fixes: (navigation.offStreak?.fixes ?? 0) + 1,
      sinceMs: navigation.offStreak ? navigation.offStreak.sinceMs : timeMs,
    };
    // Without times from the phone, the count alone decides.
    const lasted =
      streak.sinceMs === null ||
      timeMs === null ||
      timeMs - streak.sinceMs >= OFF_SECONDS * 1000;
    if (streak.fixes < OFF_FIXES || !lasted) {
      return { navigation: { ...seen, offStreak: streak }, cues: [] };
    }
    return {
      navigation: { ...seen, offRoute: true, offStreak: null, backFixes: 0 },
      cues: [{ say: words.offRoute, vibrate: true }],
    };
  }
  // Fixes found ahead after a gap were BACK_FIXES on the route already.
  if (navigation.offRoute && !rejoined) {
    if (poor) {
      return { navigation: seen, cues: [] };
    }
    const backFixes = navigation.backFixes + 1;
    if (backFixes < BACK_FIXES) {
      return { navigation: { ...seen, backFixes }, cues: [] };
    }
  }
  const cues: Cue[] = navigation.offRoute
    ? [{ say: words.backOnRoute, vibrate: false }]
    : [];
  // A poor fix on the route neither ends nor extends a streak off it, nor
  // places a runner lost after a gap.
  const offStreak = poor ? navigation.offStreak : null;
  const placed: Navigation = { ...seen, lost: poor && lost, found: null };
  const { directions } = navigation;
  let next = navigation.next;
  while (next < directions.length && directions[next].distance_m + PASS_M <= alongM) {
    next += 1;
  }
  const total = navigation.along[navigation.along.length - 1] ?? 0;
  const atEnd = total - alongM <= ARRIVE_M;
  // A direction within ARRIVE_M of the end cannot be passed by PASS_M
  // before the route ends: at the end, it is behind (TASK-253).
  if (atEnd) {
    next = directions.length;
  }
  let saidUpTo = Math.max(navigation.saidUpTo, next - 1);
  const endFixes = atEnd && !poor ? (navigation.endFixes ?? 0) + 1 : 0;
  if (endFixes >= ARRIVE_FIXES) {
    cues.push({ say: words.arrived, vibrate: true });
    return {
      navigation: {
        ...placed,
        alongM,
        next,
        saidUpTo,
        offRoute: false,
        offStreak: null,
        backFixes: 0,
        endFixes,
        arrived: true,
      },
      cues,
    };
  }
  const aheadM = next < directions.length ? directions[next].distance_m - alongM : null;
  if (
    aheadM !== null &&
    next > saidUpTo &&
    aheadM <= (navigation.announceM ?? ANNOUNCE_M)
  ) {
    const chain = chainFrom(directions, next);
    cues.push({ say: words.announcement(chain, aheadM), vibrate: true });
    saidUpTo = next + chain.length - 1;
  }
  return {
    navigation: {
      ...placed,
      alongM,
      next,
      saidUpTo,
      offRoute: false,
      offStreak,
      backFixes: 0,
      endFixes,
    },
    cues,
  };
}

/** Whether a fix taken at `timeMs` comes GAP_MS or more after the last one,
 * for a runner placed on the route before: one never on it yet, walking to
 * the start, is not looked for further on. */
function gapBefore(navigation: Navigation, timeMs: number | null): boolean {
  const lastMs = navigation.lastFixMs ?? null;
  return (
    timeMs !== null &&
    lastMs !== null &&
    timeMs - lastMs >= GAP_MS &&
    navigation.alongM > 0
  );
}

/**
 * A fix off the route near where the runner was, placed on the route ahead
 * after a gap: near where the fix before was found, one more in a row, or
 * else anywhere from where the runner was to the end, the first in a row.
 * `locate`'s cost picks the nearest pass ahead, as near where the runner
 * was. Null when the fix is off the route there too.
 */
function foundAhead(navigation: Navigation, fix: LatLon): Found | null {
  const { points, along, found } = navigation;
  if (found !== null && found !== undefined) {
    const near = locate(points, along, fix, found.alongM);
    if (near.offM <= OFF_ROUTE_M) {
      return { alongM: near.alongM, fixes: found.fixes + 1 };
    }
  }
  const far = locate(points, along, fix, navigation.alongM, Infinity);
  return far.offM <= OFF_ROUTE_M ? { alongM: far.alongM, fixes: 1 } : null;
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
