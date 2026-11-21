import type { LatLon } from "@shaperoute/shared-types";

import type { Track, TrackFix } from "../navigation/trackRecorder";

/**
 * Flights made up for the tests of the flight screen (TASK-479 part B1):
 * glides and circlings in a wind, a fix every `everyMs`, exact heights.
 * Only the tests and the simulator's made-up flight use it.
 */

export const T0 = 1_794_470_400_000;
export const ORIGIN: LatLon = [45.7355, 10.835];
const EARTH_RADIUS_M = 6_371_008.8;
const RAD = Math.PI / 180;

/** The point `east`, `north` metres from ORIGIN. */
export function pointAt(east: number, north: number): LatLon {
  return [
    ORIGIN[0] + north / (EARTH_RADIUS_M * RAD),
    ORIGIN[1] + east / (Math.cos(ORIGIN[0] * RAD) * EARTH_RADIUS_M * RAD),
  ];
}

/** A wind blowing FROM `fromDeg` at `mps`, as the drift it gives, m/s
 * east and north. */
export function driftOf(fromDeg: number, mps: number): { x: number; y: number } {
  return { x: -Math.sin(fromDeg * RAD) * mps, y: -Math.cos(fromDeg * RAD) * mps };
}

export type Leg =
  | {
      kind: "glide";
      seconds: number;
      /** Airspeed, m/s, heading `headingDeg`. */
      airspeedMps: number;
      headingDeg: number;
      varioMps: number;
    }
  | {
      kind: "circle";
      seconds: number;
      airspeedMps: number;
      /** Seconds for a whole turn. */
      turnSeconds: number;
      /** + clockwise. */
      direction: 1 | -1;
      varioMps: number;
    };

export type FlightOptions = {
  everyMs?: number;
  fromAltM?: number;
  wind?: { fromDeg: number; mps: number };
};

/** A track flying `legs` from ORIGIN at T0. */
export function flightOf(legs: readonly Leg[], options: FlightOptions = {}): Track {
  const everyMs = options.everyMs ?? 1000;
  const drift = options.wind
    ? driftOf(options.wind.fromDeg, options.wind.mps)
    : { x: 0, y: 0 };
  const fixes: TrackFix[] = [];
  let x = 0;
  let y = 0;
  let h = options.fromAltM ?? 1500;
  let t = 0;
  let heading = 0;
  const push = () =>
    fixes.push({ point: pointAt(x, y), timeMs: T0 + t, accuracyM: 4, altitudeM: h });
  push();
  for (const leg of legs) {
    const steps = Math.round((leg.seconds * 1000) / everyMs);
    if (leg.kind === "glide") {
      heading = leg.headingDeg;
    }
    for (let s = 0; s < steps; s += 1) {
      const dt = everyMs / 1000;
      if (leg.kind === "circle") {
        heading += (leg.direction * 360 * dt) / leg.turnSeconds;
      }
      x += (Math.sin(heading * RAD) * leg.airspeedMps + drift.x) * dt;
      y += (Math.cos(heading * RAD) * leg.airspeedMps + drift.y) * dt;
      h += leg.varioMps * dt;
      t += everyMs;
      push();
    }
  }
  let distanceM = 0;
  for (let i = 1; i < fixes.length; i += 1) {
    const [a, b] = [fixes[i - 1].point, fixes[i].point];
    distanceM += Math.hypot(
      (b[1] - a[1]) * Math.cos(ORIGIN[0] * RAD) * EARTH_RADIUS_M * RAD,
      (b[0] - a[0]) * EARTH_RADIUS_M * RAD,
    );
  }
  return { fixes, distanceM };
}
