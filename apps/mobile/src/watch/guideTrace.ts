import type { Direction, LatLon } from "@shaperoute/shared-types";

import {
  type Cue,
  chainFrom,
  type Navigation,
  onFix,
  startNavigation,
  waitingToJoin,
} from "../navigation/navigator";
import { movePen, type Pen, startPen } from "../navigation/penUp";
import { wordsOf } from "../voice/words";
import type { Scenario } from "./guideScenarios";

/**
 * What the phone's navigator does along a scenario (TASK-370 part B1,
 * ADR-0314), written for the watch's XCTest: after each fix, where the
 * runner is placed and what is said, as kinds of cue instead of words. The
 * watch has no voice: it vibrates and shows, so it needs what a cue is, not
 * its sentence. The files are in targets/watch/Core/Fixtures/guide/,
 * written by scripts/watch-guide.sh. From part B2 a trace also has a closed
 * route joined wherever the runner reaches it, with the route from there,
 * and the pen of a route in pieces, moved after each fix as the run does
 * (useNavigation.ts).
 */

/** The version of the trace files: the Swift side reads only this one. */
export const GUIDE_TRACE_VERSION = 2;

/** Where the trace files are, from apps/mobile. */
export const GUIDE_TRACE_DIR = "targets/watch/Core/Fixtures/guide";

/** A cue of the navigator, by kind. */
export type TraceCue =
  | { kind: "depart"; index: number; vibrate: boolean }
  | { kind: "turn"; index: number; count: number; aheadM: number; vibrate: boolean }
  | { kind: "offRoute"; vibrate: boolean }
  | { kind: "routeAt"; distanceM: number; bearingDeg: number; vibrate: boolean }
  | { kind: "backOnRoute"; vibrate: boolean }
  | { kind: "arrived"; vibrate: boolean };

/** A cue of the pen: up at the end of a letter or part, down at the start
 * of the next; `letter` is the next one, null when the route has none. */
export type TracePenCue = {
  kind: "penUp" | "penDown";
  letter: string | null;
  vibrate: boolean;
};

/** A route as the watch must have it after joining a closed one. */
export type TraceRoute = {
  pointCount: number;
  lengthM: number;
  directions: TraceDirection[];
};

export type TraceStep = {
  fix: LatLon;
  accuracyM: number | null;
  timeMs: number | null;
  alongM: number;
  next: number;
  saidUpTo: number;
  offRoute: boolean;
  lost: boolean;
  arrived: boolean;
  rejoin: { alongM: number; distanceM: number; bearingDeg: number } | null;
  /** Still to join a closed route. */
  waiting: boolean;
  /** Where the run joined a closed route, along it as drawn; null before
   * and along any other route. */
  joinedAtM: number | null;
  /** The route from where it was joined, at the fix that joins it. */
  route: TraceRoute | null;
  cues: TraceCue[];
  /** The pen after the fix, for a route in pieces; null for any other. */
  pen: { next: number; up: boolean; cues: TracePenCue[] } | null;
};

/** What the watch needs of a direction to follow the route. */
export type TraceDirection = Pick<
  Direction,
  "distance_m" | "turn" | "angle_deg" | "joined" | "street" | "branches"
>;

export type Trace = {
  version: number;
  name: string;
  announceM: number;
  anywhere: boolean;
  points: LatLon[];
  directions: TraceDirection[];
  /** The pen at the start, for a route in pieces; null for any other. */
  pen: {
    walks: { fromM: number; toM: number; letter: string | null }[];
    ride: boolean;
    parts: boolean;
    paddle: boolean;
    downM: number;
  } | null;
  start: TraceCue[];
  steps: TraceStep[];
};

/** Metres and degrees in a trace: four decimals, a tenth of a millimetre. */
function m(value: number): number {
  return Number(value.toFixed(4));
}

function traceDirections(directions: readonly Direction[]): TraceDirection[] {
  return directions.map(
    ({ distance_m, turn, angle_deg, joined, street, branches }) => ({
      distance_m: m(distance_m),
      turn,
      angle_deg: m(angle_deg),
      joined,
      street,
      branches,
    }),
  );
}

/** The phone's navigator along `scenario`. */
export function traceOf(scenario: Scenario): Trace {
  const { points, directions, announceM, anywhere, walks, word, activity } = scenario;
  const started = startNavigation(points, directions, "en", announceM, anywhere);
  let navigation = started.navigation;
  let pen: Pen | null =
    walks.length > 0 ? startPen(started.navigation.along, walks, word, activity) : null;
  const firstPen = pen;
  const steps = scenario.fixes.map(({ fix, accuracyM, timeMs }): TraceStep => {
    const before = navigation;
    const after = onFix(before, fix, { accuracyM, timeMs }, "en");
    navigation = after.navigation;
    const joinedNow =
      before.joinedAtM === undefined && navigation.joinedAtM !== undefined;
    let penStep: TraceStep["pen"] = null;
    if (pen !== null) {
      const walk = pen.walks[pen.next];
      const drawn = movePen(pen, navigation.alongM, accuracyM, "en");
      pen = drawn.pen;
      penStep = {
        next: pen.next,
        up: pen.up,
        cues: drawn.cues.map((cue) => ({
          kind: drawn.move === "up" ? "penUp" : "penDown",
          letter: walk?.letter ?? null,
          vibrate: cue.vibrate,
        })),
      };
    }
    return {
      fix,
      accuracyM,
      timeMs,
      alongM: m(navigation.alongM),
      next: navigation.next,
      saidUpTo: navigation.saidUpTo,
      offRoute: navigation.offRoute,
      lost: navigation.lost === true,
      arrived: navigation.arrived,
      rejoin:
        navigation.rejoin === null || navigation.rejoin === undefined
          ? null
          : {
              alongM: m(navigation.rejoin.alongM),
              distanceM: m(navigation.rejoin.distanceM),
              bearingDeg: m(navigation.rejoin.bearingDeg),
            },
      waiting: waitingToJoin(navigation),
      joinedAtM: navigation.joinedAtM === undefined ? null : m(navigation.joinedAtM),
      route: joinedNow
        ? {
            pointCount: navigation.points.length,
            lengthM: m(navigation.along[navigation.along.length - 1] ?? 0),
            directions: traceDirections(navigation.directions),
          }
        : null,
      cues: after.cues.map((cue) => kindOf(cue, navigation)),
      pen: penStep,
    };
  });
  return {
    version: GUIDE_TRACE_VERSION,
    name: scenario.name,
    announceM,
    anywhere,
    points,
    directions: traceDirections(directions),
    pen:
      firstPen === null
        ? null
        : {
            walks: firstPen.walks.map(({ fromM, toM, letter }) => ({
              fromM: m(fromM),
              toM: m(toM),
              letter,
            })),
            ride: firstPen.ride,
            parts: firstPen.parts,
            paddle: firstPen.paddle,
            downM: firstPen.downM,
          },
    start: started.cues.map((cue) => kindOf(cue, started.navigation)),
    steps,
  };
}

/** A trace as the script writes it, before Prettier formats it: the jest
 * test compares what the file says, not how it is laid out. */
export function traceJson(trace: Trace): string {
  return `${JSON.stringify(trace)}\n`;
}

/**
 * The kind of a cue, from its words in English, given the navigation after
 * the fix: the words are the phone's, the kinds the watch's. A cue of no
 * kind is an error: a new cue of the navigator needs a kind here, and in
 * the watch's Navigator.swift.
 */
function kindOf(cue: Cue, navigation: Navigation): TraceCue {
  const words = wordsOf("en", "km");
  const { vibrate } = cue;
  if (cue.say === words.offRoute) {
    return { kind: "offRoute", vibrate };
  }
  if (cue.say === words.backOnRoute) {
    return { kind: "backOnRoute", vibrate };
  }
  if (cue.say === words.arrived) {
    return { kind: "arrived", vibrate };
  }
  const { rejoin, directions, next, saidUpTo, alongM } = navigation;
  if (
    rejoin !== null &&
    rejoin !== undefined &&
    cue.say === words.routeAt(rejoin.distanceM, rejoin.bearingDeg)
  ) {
    return {
      kind: "routeAt",
      distanceM: m(rejoin.distanceM),
      bearingDeg: m(rejoin.bearingDeg),
      vibrate,
    };
  }
  if (next < directions.length) {
    const chain = chainFrom(directions, next);
    const aheadM = directions[next].distance_m - alongM;
    if (
      cue.say === words.announcement(chain, aheadM) &&
      saidUpTo === next + chain.length - 1
    ) {
      return {
        kind: "turn",
        index: next,
        count: chain.length,
        aheadM: m(aheadM),
        vibrate,
      };
    }
  }
  const departure = directions[0];
  if (departure?.turn === "depart" && cue.say === words.direction(departure)) {
    return { kind: "depart", index: 0, vibrate };
  }
  throw new Error(`A cue of no kind: "${cue.say}"`);
}
