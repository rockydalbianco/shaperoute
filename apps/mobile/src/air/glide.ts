import type { Wind } from "./wind";

/**
 * The glide over a way (TASK-479 part D2, ADR-0388): how much height the
 * legs take with a glide ratio through the air and the wind. Always a
 * number for the pilot to read, never a «yes»: the screen shows the
 * height left at the end, + or −. Part D2 glides at L/D 8 with the wind
 * worked out in the air (B1), none without; part D3 lets the pilot choose.
 */

/** The glide ratio through the air when the pilot chose none. */
export const DEFAULT_LD = 8;
/** The speed through the air when the wind's circles did not give one:
 * a paraglider's trim, 36 km/h. */
export const DEFAULT_AIRSPEED_MPS = 10;
/** An airspeed from the circles outside this is not a glide's. */
const AIRSPEEDS: readonly [number, number] = [6, 20];

export type Leg = { distM: number; courseDeg: number };

export type Glide = { ld: number; airspeedMps: number; wind: Wind | null };

/** The glide of `wind`'s flight: its airspeed when likely, L/D 8. */
export function glideOf(wind: Wind | null, ld = DEFAULT_LD): Glide {
  const measured = wind?.airspeedMps;
  const airspeedMps =
    measured !== undefined && measured >= AIRSPEEDS[0] && measured <= AIRSPEEDS[1]
      ? measured
      : DEFAULT_AIRSPEED_MPS;
  return { ld, airspeedMps, wind };
}

/** The glide ratio over the ground along `courseDeg`; null where the wind
 * holds the glider back (no way forward). */
export function groundRatio(glide: Glide, courseDeg: number): number | null {
  const { ld, airspeedMps: va, wind } = glide;
  if (wind === null || wind.speedMps === 0) {
    return ld;
  }
  // The wind goes where it blows to: from + 180°.
  const angle = ((wind.fromDeg + 180 - courseDeg) * Math.PI) / 180;
  const tail = wind.speedMps * Math.cos(angle);
  const cross = wind.speedMps * Math.sin(angle);
  if (Math.abs(cross) >= va) {
    return null;
  }
  const ground = Math.sqrt(va * va - cross * cross) + tail;
  return ground <= 0 ? null : (ld * ground) / va;
}

/** The height the legs take, metres; null if one cannot be flown. */
export function heightForM(legs: readonly Leg[], glide: Glide): number | null {
  let height = 0;
  for (const leg of legs) {
    if (leg.distM === 0) {
      continue;
    }
    const ratio = groundRatio(glide, leg.courseDeg);
    if (ratio === null) {
      return null;
    }
    height += leg.distM / ratio;
  }
  return height;
}
