import type { LatLon } from "@shaperoute/shared-types";

import type { FreeRun } from "../navigation/freeRun";
import { loadSport, runActivityOf, type Sport } from "../settings/sport";
import { isFlight } from "./flight";
import { flightParts, flightSplit } from "./flightParts";
import { phaseMarksOf } from "./phaseMarks";

/**
 * A race on foot and in the air on its map (TASK-305 part R6c, the user's
 * words of 2026-11-12, «White: on foot. Yellow: in the air.»): the track's
 * line white where the pilot walked or ran, yellow where it flew, as a day
 * of skiing's lifts are drawn apart from its descents (TASK-375 part C2).
 */

/** A part in the air, as the fixes of the track it spans. */
export type AirLeg = { from: number; to: number };

/** The parts of `run` in the air, as stretches of its fixes, in their
 * order; null for any other sport and for a flight with no part on foot:
 * its line is then a flight's, all white, as before. */
export function airLegsOf(run: FreeRun, sport: Sport = loadSport()): AirLeg[] | null {
  if (!isFlight(runActivityOf(sport))) {
    return null;
  }
  const fixes = run.track.fixes;
  const first = fixes[0]?.timeMs;
  if (first === undefined) {
    return null;
  }
  const parts = flightParts(run.track, phaseMarksOf(first));
  if (flightSplit(parts) === null) {
    return null;
  }
  const legs: AirLeg[] = [];
  for (const part of parts) {
    if (part.kind !== "air") {
      continue;
    }
    let from = -1;
    let to = -1;
    fixes.forEach((fix, i) => {
      if (fix.timeMs >= part.startMs && fix.timeMs <= part.endMs) {
        if (from === -1) {
          from = i;
        }
        to = i;
      }
    });
    if (from !== -1 && to > from) {
      legs.push({ from, to });
    }
  }
  return legs.length > 0 ? legs : null;
}

const known = new WeakMap<FreeRun, AirLeg[] | null>();

/** As `airLegsOf`, once per run: the end screen asks at every drawing, and
 * a new list would draw the line again. */
export function flightAirOf(run: FreeRun | null): AirLeg[] | null {
  if (run === null) {
    return null;
  }
  if (!known.has(run)) {
    known.set(run, airLegsOf(run));
  }
  return known.get(run) ?? null;
}

/** The line through `points` cut at `air`: what was done on foot, and what
 * in the air. Each piece shares its ends with the ones beside it, so the
 * line has no hole. */
export function splitAtAir(
  points: readonly LatLon[],
  air: readonly AirLeg[],
): { foot: LatLon[][]; air: LatLon[][] } {
  const foot: LatLon[][] = [];
  const flown: LatLon[][] = [];
  let from = 0;
  for (const leg of air) {
    if (leg.from > from) {
      foot.push(points.slice(from, leg.from + 1));
    }
    flown.push(points.slice(leg.from, leg.to + 1));
    from = leg.to;
  }
  if (points.length - 1 > from) {
    foot.push(points.slice(from));
  }
  const drawn = (line: LatLon[]) => line.length > 1;
  return { foot: foot.filter(drawn), air: flown.filter(drawn) };
}
