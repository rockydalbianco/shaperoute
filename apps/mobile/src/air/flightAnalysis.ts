import type { LatLon } from "@shaperoute/shared-types";

import type { Track } from "../navigation/trackRecorder";
import type { FlightFix } from "./flightArchive";
import { circlings } from "./thermal";
import { distanceM } from "./taskRoute";

/**
 * The analysis of a flight after it (TASK-479 part F3a, ADR-0388 addition
 * F): its thermals (each circling that gained height, from `thermal.ts`),
 * its glides (the straight flights between them), the share of the time
 * spent in thermals, and the series the charts draw. From the flight kept
 * whole on the phone (`flightArchive`). Numbers only, never advice.
 */

/** A glide shorter than this is a step between two circlings, not a glide. */
export const MIN_GLIDE_MS = 60_000;
export const MIN_GLIDE_M = 300;
/** Below this height lost there is no glide ratio: it would be a guess. */
export const MIN_GLIDE_LOSS_M = 10;
/** The charts have at most this many samples. */
export const MAX_SAMPLES = 600;
/** The vario of the charts: the height gained over this window. */
export const CHART_VARIO_MS = 10_000;
/** The speed of the charts: the way flown over this window. */
export const CHART_SPEED_MS = 5_000;

export type ThermalPart = {
  startMs: number;
  endMs: number;
  /** Where it was: its middle fix. */
  centre: LatLon;
  entryAltM: number;
  exitAltM: number;
  avgClimbMps: number;
};

export type GlidePart = {
  startMs: number;
  endMs: number;
  from: LatLon;
  to: LatLon;
  /** Straight from its start to its end. */
  distanceM: number;
  /** Along the way flown, over the time. */
  speedMps: number;
  /** Distance over height lost; null without heights or when it lost less
   * than MIN_GLIDE_LOSS_M. */
  ld: number | null;
};

export type ChartSample = {
  atMs: number;
  altM: number | null;
  varioMps: number | null;
  speedMps: number | null;
};

export type FlightAnalysis = {
  startMs: number;
  endMs: number;
  durationS: number;
  maxAltM: number | null;
  /** The best thermal's average climb; null without one. */
  bestClimbMps: number | null;
  /** Of the flight's time, 0 to 1. */
  thermalShare: number;
  thermals: ThermalPart[];
  glides: GlidePart[];
  samples: ChartSample[];
};

const dist = (a: LatLon, b: LatLon) => distanceM(a, b, "faiSphere");

/** The kept fixes as a track, for the functions that read one. */
export function trackOfFixes(fixes: readonly FlightFix[]): Track {
  let metres = 0;
  for (let i = 1; i < fixes.length; i += 1) {
    metres += dist(fixes[i - 1].point, fixes[i].point);
  }
  return {
    distanceM: metres,
    fixes: fixes.map((fix) => ({
      point: fix.point,
      timeMs: fix.timeMs,
      accuracyM: null,
      altitudeM: fix.altM,
    })),
  };
}

/** The way flown from fix `from` to fix `to`. */
function alongM(fixes: readonly FlightFix[], from: number, to: number): number {
  let metres = 0;
  for (let i = from + 1; i <= to; i += 1) {
    metres += dist(fixes[i - 1].point, fixes[i].point);
  }
  return metres;
}

function glideOf(
  fixes: readonly FlightFix[],
  from: number,
  to: number,
): GlidePart | null {
  const [a, b] = [fixes[from], fixes[to]];
  const ms = b.timeMs - a.timeMs;
  const straight = dist(a.point, b.point);
  if (ms < MIN_GLIDE_MS || straight < MIN_GLIDE_M) {
    return null;
  }
  const lost = a.altM === null || b.altM === null ? null : a.altM - b.altM;
  return {
    startMs: a.timeMs,
    endMs: b.timeMs,
    from: a.point,
    to: b.point,
    distanceM: straight,
    speedMps: alongM(fixes, from, to) / (ms / 1000),
    ld: lost === null || lost < MIN_GLIDE_LOSS_M ? null : straight / lost,
  };
}

/** The first index at or after `ms`, from `start`. */
function indexAt(fixes: readonly FlightFix[], ms: number, start: number): number {
  let i = start;
  while (i < fixes.length - 1 && fixes[i].timeMs < ms) {
    i += 1;
  }
  return i;
}

function samplesOf(fixes: readonly FlightFix[]): ChartSample[] {
  const first = fixes[0].timeMs;
  const last = fixes[fixes.length - 1].timeMs;
  const step = Math.max(1000, (last - first) / (MAX_SAMPLES - 1));
  const out: ChartSample[] = [];
  let i = 0;
  let back = 0;
  let speedBack = 0;
  for (let at = first; at <= last + 1e-6 && out.length < MAX_SAMPLES; at += step) {
    i = indexAt(fixes, at, i);
    const fix = fixes[i];
    back = indexAt(fixes, fix.timeMs - CHART_VARIO_MS, back);
    speedBack = indexAt(fixes, fix.timeMs - CHART_SPEED_MS, speedBack);
    const old = fixes[back];
    const varioSpan = fix.timeMs - old.timeMs;
    const speedSpan = fix.timeMs - fixes[speedBack].timeMs;
    out.push({
      atMs: fix.timeMs,
      altM: fix.altM,
      varioMps:
        fix.altM === null || old.altM === null || varioSpan < CHART_VARIO_MS / 2
          ? null
          : (fix.altM - old.altM) / (varioSpan / 1000),
      speedMps:
        speedSpan < CHART_SPEED_MS / 2
          ? null
          : alongM(fixes, speedBack, i) / (speedSpan / 1000),
    });
  }
  return out;
}

/** The analysis of a flight; null with fewer than two fixes. */
export function analysisOf(fixes: readonly FlightFix[]): FlightAnalysis | null {
  if (fixes.length < 2) {
    return null;
  }
  const startMs = fixes[0].timeMs;
  const endMs = fixes[fixes.length - 1].timeMs;
  const circles = circlings(trackOfFixes(fixes));
  const thermals: ThermalPart[] = circles.flatMap((c) =>
    c.startAltM === null ||
    c.endAltM === null ||
    c.avgMps === null ||
    c.gainM === null ||
    c.gainM <= 0
      ? []
      : [
          {
            startMs: c.startMs,
            endMs: c.endMs,
            centre: fixes[Math.round((c.from + c.to) / 2)].point,
            entryAltM: c.startAltM,
            exitAltM: c.endAltM,
            avgClimbMps: c.avgMps,
          },
        ],
  );
  // Between the circlings, before the first and after the last.
  const glides: GlidePart[] = [];
  let from = 0;
  for (const c of circles) {
    const glide = glideOf(fixes, from, c.from);
    if (glide !== null) {
      glides.push(glide);
    }
    from = c.to;
  }
  const tail = glideOf(fixes, from, fixes.length - 1);
  if (tail !== null) {
    glides.push(tail);
  }
  const heights = fixes.flatMap((fix) => (fix.altM === null ? [] : [fix.altM]));
  const inThermals = thermals.reduce((sum, t) => sum + (t.endMs - t.startMs), 0);
  const span = endMs - startMs;
  return {
    startMs,
    endMs,
    durationS: Math.round(span / 1000),
    maxAltM: heights.length === 0 ? null : Math.max(...heights),
    bestClimbMps:
      thermals.length === 0 ? null : Math.max(...thermals.map((t) => t.avgClimbMps)),
    thermalShare: span <= 0 ? 0 : Math.min(1, inThermals / span),
    thermals,
    glides,
    samples: samplesOf(fixes),
  };
}
