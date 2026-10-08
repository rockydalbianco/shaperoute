import type { Activity } from "@shaperoute/shared-types";

import { distanceForSport, switchDistance, toDistanceM } from "../route/distance";
import { shownNumber, writeDistance } from "./distanceInput";
import type { Units } from "./units";

/**
 * The distance of «Draw» as App.tsx keeps it (TASK-182 part E, ADR-0149):
 * the field's text as it was typed (−, + and «Use N mi» write it too), or a
 * distance the app chose by itself, in metres: a «Try», a small lake's
 * (TASK-240). Those metres are asked for as they are, in either unit, and
 * the field shows them in the app's units: a lake's 1500 m is "0.9" with
 * «Miles», below the 1 mi the field takes, because at 1 mi the shapes would
 * not fit.
 */
export type DrawDistance = { text: string } | { metres: number };

/** What the distance was last fitted to: the sport and the app's units. */
export type DrawnFor = { activity: Activity; units: Units };

/**
 * The metres as a text in km, to the metre: what App.tsx wrote before part
 * E ("1.5", "4.828"), and what `route/distance` reads as just those metres
 * in either unit.
 */
function kmText(metres: number): string {
  return String(metres / 1000);
}

/** The text in km for the app's metres, or the text typed. */
function textOf(distance: DrawDistance): string {
  return "text" in distance ? distance.text : kmText(distance.metres);
}

/**
 * The field's text in the app's `units`: as typed; the app's metres as the
 * field shows them, in km as before ("1.5"), with «Miles» to the tenth
 * ("0.9 mi", "3 mi").
 */
export function fieldText(distance: DrawDistance, units: Units): string {
  if ("text" in distance) {
    return distance.text;
  }
  const km = kmText(distance.metres);
  return units === "km" ? km : writeDistance(shownNumber(km, "mi"), "mi");
}

/**
 * The whole metres asked for, null when the field is not a valid distance
 * for `activity`: as `toDistanceM` reads what is typed; the app's metres as
 * they are, within the limits of the sport in km.
 */
export function distanceMOf(
  distance: DrawDistance,
  activity: Activity,
  units: Units,
): number | null {
  return toDistanceM(textOf(distance), activity, units);
}

/** Where the distance starts: 5 km of a run, in the app's units (3 mi). */
export function firstDistance({ activity, units }: DrawnFor): DrawDistance {
  return { text: distanceForSport("5", activity, units) };
}

/**
 * The distance once the sport or the app's units change: a sport just
 * chosen brings it within its limits (TASK-190); units just chosen in
 * «Settings» give the same distance to the nearest whole km or mile within
 * the limits (5 km are 3 mi), the app's metres too. Either way the field is
 * typed again, in the app's units.
 */
export function refitDistance(
  distance: DrawDistance,
  from: DrawnFor,
  to: DrawnFor,
): DrawDistance {
  const text = textOf(distance);
  return {
    text:
      from.activity !== to.activity
        ? distanceForSport(text, to.activity, to.units)
        : switchDistance(text, to.activity, to.units),
  };
}
