import { METRES_PER_FOOT, METRES_PER_KM, METRES_PER_MILE } from "../units/format";
import type { Units } from "../units/units";

/**
 * The units of the flight screen (TASK-479 part B1, ADR-0388): the app's
 * own (km or miles) and, as a pilot's choice, feet and knots. The code
 * stays in metres, metres a second and degrees; only the words change.
 */

export type AltitudeUnit = "m" | "ft";
export type VarioUnit = "mps" | "fpm" | "kt";
export type SpeedUnit = "kmh" | "mph" | "kt";

export type FlightUnits = {
  altitude: AltitudeUnit;
  vario: VarioUnit;
  speed: SpeedUnit;
};

export const ALTITUDE_UNITS: readonly AltitudeUnit[] = ["m", "ft"];
export const VARIO_UNITS: readonly VarioUnit[] = ["mps", "fpm", "kt"];
export const SPEED_UNITS: readonly SpeedUnit[] = ["kmh", "mph", "kt"];

/** A nautical mile, in metres. */
export const METRES_PER_NAUTICAL_MILE = 1852;

/** What a flight starts with, before the pilot chooses: the app's units. */
export function defaultFlightUnits(units: Units): FlightUnits {
  return units === "mi"
    ? { altitude: "ft", vario: "fpm", speed: "mph" }
    : { altitude: "m", vario: "mps", speed: "kmh" };
}

export function isFlightUnits(value: unknown): value is FlightUnits {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const units = value as Record<string, unknown>;
  return (
    ALTITUDE_UNITS.includes(units.altitude as AltitudeUnit) &&
    VARIO_UNITS.includes(units.vario as VarioUnit) &&
    SPEED_UNITS.includes(units.speed as SpeedUnit)
  );
}

/** The dash of a number not known now. */
export const NO_VALUE = "–";

/** The words after a number, in every language the same. */
export const UNIT_LABEL: Readonly<
  Record<AltitudeUnit | VarioUnit | SpeedUnit, string>
> = {
  m: "m",
  ft: "ft",
  mps: "m/s",
  fpm: "ft/min",
  kt: "kt",
  kmh: "km/h",
  mph: "mph",
};

function finite(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}

/** Whole metres or feet. */
export function altitudeText(metres: number | null, unit: AltitudeUnit): string {
  if (!finite(metres)) {
    return NO_VALUE;
  }
  const value = unit === "ft" ? metres / METRES_PER_FOOT : metres;
  // No "-0".
  return String(Math.round(value) || 0);
}

/** A height with its sign: "+120", "-40", "0". */
export function heightChangeText(metres: number | null, unit: AltitudeUnit): string {
  const text = altitudeText(metres, unit);
  return finite(metres) &&
    Math.round(unit === "ft" ? metres / METRES_PER_FOOT : metres) > 0
    ? `+${text}`
    : text;
}

/**
 * The climb with its sign: "+1.2", "-0.8", "0.0" in m/s and knots (one
 * decimal), whole tens in ft/min ("+240").
 */
export function varioText(mps: number | null, unit: VarioUnit): string {
  if (!finite(mps)) {
    return NO_VALUE;
  }
  if (unit === "fpm") {
    // Feet a minute, to the nearest ten.
    const tens = Math.round((mps / METRES_PER_FOOT) * 6) * 10 || 0;
    return tens > 0 ? `+${tens}` : String(tens);
  }
  const value = unit === "kt" ? (mps * 3600) / METRES_PER_NAUTICAL_MILE : mps;
  const tenths = Math.round(value * 10);
  const text = (Math.abs(tenths) / 10).toFixed(1);
  return tenths > 0 ? `+${text}` : tenths < 0 ? `-${text}` : text;
}

/** Whole km/h, mph or knots. */
export function speedText(mps: number | null, unit: SpeedUnit): string {
  if (!finite(mps)) {
    return NO_VALUE;
  }
  const perHour = mps * 3600;
  const metresPer =
    unit === "kmh"
      ? METRES_PER_KM
      : unit === "mph"
        ? METRES_PER_MILE
        : METRES_PER_NAUTICAL_MILE;
  return String(Math.round(perHour / metresPer));
}

/** A distance in the app's units: "850" m under a kilometre, "12.4" km
 * after; feet and miles in miles. The unit is `distanceUnit`'s. */
export function distanceText(metres: number | null, units: Units): string {
  if (!finite(metres)) {
    return NO_VALUE;
  }
  if (units === "mi") {
    const miles = metres / METRES_PER_MILE;
    return miles < 0.1
      ? String(Math.round(metres / METRES_PER_FOOT))
      : miles.toFixed(1);
  }
  return metres < 1000
    ? String(Math.round(metres))
    : (metres / METRES_PER_KM).toFixed(1);
}

export function distanceUnit(metres: number | null, units: Units): string {
  if (units === "mi") {
    return finite(metres) && metres / METRES_PER_MILE < 0.1 ? "ft" : "mi";
  }
  return finite(metres) && metres < 1000 ? "m" : "km";
}

/** "245°", the bearing from north, clockwise. */
export function bearingText(degrees: number | null): string {
  if (!finite(degrees)) {
    return NO_VALUE;
  }
  const whole = Math.round(((degrees % 360) + 360) % 360) % 360;
  return `${whole}°`;
}

/** The glide ratio: "8.4", whole from 20 on. */
export function glideText(ratio: number | null): string {
  if (!finite(ratio)) {
    return NO_VALUE;
  }
  return ratio >= 20 ? String(Math.round(ratio)) : ratio.toFixed(1);
}

/** "1:05:09" or "5:09". */
export function durationText(ms: number | null): string {
  if (!finite(ms) || ms < 0) {
    return NO_VALUE;
  }
  const seconds = Math.floor(ms / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

/** "14:05", the phone's clock. */
export function clockText(ms: number): string {
  const at = new Date(ms);
  return `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
}
