import { t, tLater } from "../i18n";
import type { Units } from "../units/units";
import type { Near } from "./airspaceNear";
import {
  type AltitudeUnit,
  altitudeText,
  distanceText,
  distanceUnit,
  UNIT_LABEL,
} from "./flightUnits";
import type { Limit } from "./openair";

/**
 * The words of an airspace on the flight screen (TASK-479 part E2): its
 * limits as pilots write them (GND, FL95, UNL, a height with AGL), and the
 * warning approved by the user on 2026-11-21 (notice 5), with the line for
 * flight levels (notice 7). Never a word saying a volume is free.
 */

export const NEAR_LINE = tLater("{name} ({class}) · {dist} · floor {floor}");
export const FL_LINE = tLater("FL limits from GPS altitude (≈).");

/** A limit as pilots write it, in the pilot's altitude unit. */
export function limitLabel(limit: Limit, unit: AltitudeUnit): string {
  switch (limit.kind) {
    case "ground":
      return "GND";
    case "aboveGround":
      return `${altitudeText(limit.metres, unit)} ${UNIT_LABEL[unit]} AGL`;
    case "aboveSea":
      return `${altitudeText(limit.metres, unit)} ${UNIT_LABEL[unit]}`;
    case "flightLevel":
      return `FL${limit.level}`;
    case "unlimited":
      return "UNL";
  }
}

/** How far across: «inside» within the outline, else the distance. */
export function acrossText(near: Near, units: Units): string {
  return near.within
    ? t("inside")
    : `${distanceText(near.horizontalM, units)} ${distanceUnit(near.horizontalM, units)}`;
}

/** The warning's line: name, class, how far, the floor. */
export function nearLine(near: Near, units: Units, unit: AltitudeUnit): string {
  return t(NEAR_LINE, {
    name: near.airspace.name,
    class: near.airspace.class,
    dist: acrossText(near, units),
    floor: limitLabel(near.airspace.floor, unit),
  });
}
