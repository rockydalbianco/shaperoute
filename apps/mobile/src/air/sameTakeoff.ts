import type { LatLon } from "@shaperoute/shared-types";

import {
  type FlightFix,
  type KeptFlightEntry,
  keptFlight,
  keptFlights,
} from "./flightArchive";
import { analysisOf } from "./flightAnalysis";
import { distanceM } from "./taskRoute";
import { xcScoreOf } from "./xcScore";

/**
 * «Same takeoff» (TASK-479 part F3a, ADR-0388 addition F): this flight
 * beside the other flights kept on the phone that began within
 * SAME_TAKEOFF_M of its take-off — their average and their best for the
 * time in the air, the highest point, the average climb and the XC score.
 * With fewer than MIN_OTHERS of them there is nothing to compare.
 */

export const SAME_TAKEOFF_M = 500;
export const MIN_OTHERS = 2;
/** The other flights read: the latest ones. Each is read and scored. */
export const MAX_OTHERS = 20;

export type FlightNumbers = {
  durationS: number;
  maxAltM: number | null;
  /** The average climb of its thermals, weighted by their time. */
  avgClimbMps: number | null;
  xcPoints: number | null;
};

export type Comparison = {
  /** How many other flights. */
  others: number;
  flight: FlightNumbers;
  average: FlightNumbers;
  best: FlightNumbers;
};

/** The numbers of one flight; null with fewer than two fixes. */
export function numbersOf(fixes: readonly FlightFix[]): FlightNumbers | null {
  const analysis = analysisOf(fixes);
  if (analysis === null) {
    return null;
  }
  const time = analysis.thermals.reduce((sum, t) => sum + (t.endMs - t.startMs), 0);
  const climbed = analysis.thermals.reduce(
    (sum, t) => sum + t.avgClimbMps * (t.endMs - t.startMs),
    0,
  );
  return {
    durationS: analysis.durationS,
    maxAltM: analysis.maxAltM,
    avgClimbMps: time > 0 ? climbed / time : null,
    xcPoints: xcScoreOf(fixes.map((fix) => fix.point))?.points ?? null,
  };
}

function averageOf(values: (number | null)[]): number | null {
  const known = values.filter((v): v is number => v !== null);
  return known.length === 0 ? null : known.reduce((a, b) => a + b, 0) / known.length;
}

function bestOf(values: (number | null)[]): number | null {
  const known = values.filter((v): v is number => v !== null);
  return known.length === 0 ? null : Math.max(...known);
}

/** The other flights from `takeoff`, latest first, without `key`. */
export function sameTakeoffFlights(
  key: string,
  takeoff: LatLon,
  entries: readonly KeptFlightEntry[],
): KeptFlightEntry[] {
  return entries
    .filter(
      (one) =>
        one.key !== key &&
        distanceM(one.takeoff, takeoff, "faiSphere") <= SAME_TAKEOFF_M,
    )
    .sort((a, b) => b.startMs - a.startMs)
    .slice(0, MAX_OTHERS);
}

/**
 * This flight beside the others from its take-off; null when fewer than
 * MIN_OTHERS of them can be read. `read` and `entries` are the phone's
 * kept flights, or a test's.
 */
export function compareSameTakeoff(
  key: string,
  fixes: readonly FlightFix[],
  entries: readonly KeptFlightEntry[] = keptFlights(),
  read: (key: string) => FlightFix[] | null = (one) => keptFlight(one),
): Comparison | null {
  const flight = numbersOf(fixes);
  if (flight === null) {
    return null;
  }
  const others = sameTakeoffFlights(key, fixes[0].point, entries).flatMap((one) => {
    const kept = read(one.key);
    const numbers = kept === null ? null : numbersOf(kept);
    return numbers === null ? [] : [numbers];
  });
  if (others.length < MIN_OTHERS) {
    return null;
  }
  const pick = <K extends keyof FlightNumbers>(name: K) =>
    others.map((one) => one[name]);
  return {
    others: others.length,
    flight,
    average: {
      durationS: Math.round(averageOf(pick("durationS")) ?? 0),
      maxAltM: averageOf(pick("maxAltM")),
      avgClimbMps: averageOf(pick("avgClimbMps")),
      xcPoints: averageOf(pick("xcPoints")),
    },
    best: {
      durationS: bestOf(pick("durationS")) ?? 0,
      maxAltM: bestOf(pick("maxAltM")),
      avgClimbMps: bestOf(pick("avgClimbMps")),
      xcPoints: bestOf(pick("xcPoints")),
    },
  };
}
