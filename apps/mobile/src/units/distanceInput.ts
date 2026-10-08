import { METRES_PER_KM, METRES_PER_MILE, metresPer } from "./format";
import { appUnits, type Units } from "./units";

/**
 * The distance asked for in «Draw», typed in the app's units (TASK-182 part
 * B, ADR-0149). What the field holds is a text. In kilometres it is the
 * number alone, as it always was ("7", "7,5"); in miles the number and its
 * unit ("4.5 mi"). So a text says by itself what it measures, whoever
 * reads it and whenever: the screen that keeps it need not know the units,
 * and a text left from before «Settings» changed them still means the same
 * distance. The engine and the API are asked in whole metres.
 */

/** What ends a text typed in miles. */
const MILE_MARK = " mi";

/** A field's text apart: the number as typed, and the unit it is in. */
export type Typed = { units: Units; number: string };

export function readDistance(text: string): Typed {
  return text.endsWith(MILE_MARK)
    ? { units: "mi", number: text.slice(0, -MILE_MARK.length) }
    : { units: "km", number: text };
}

/** The field's text for a number typed in `units`. */
export function writeDistance(number: string, units: Units): string {
  return units === "mi" ? `${number}${MILE_MARK}` : number;
}

/** [lowest, highest], in whole units. */
export type Limits = readonly [lowest: number, highest: number];

/** Whole units with at most one decimal, after a point or a comma. */
const TYPED = /^(\d+)(?:[.,](\d))?$/;

/**
 * The tenths of a unit a number typed is: "7" is 70, "7,5" and "7.5" are
 * 75. Null when it is not such a number: no more than one decimal.
 */
export function typedTenths(number: string): number | null {
  const match = TYPED.exec(number.trim());
  return match ? Number(match[1]) * 10 + Number(match[2] ?? "0") : null;
}

/** The metres in a mile, times a thousand: a whole number. */
const MILLIMETRES_PER_MILE = 1_609_344;

/**
 * Tenths of a unit as whole metres: 75 tenths of a km are 7500 m, 45 of a
 * mile 7242 m. Integer arithmetic, rounded once: 4.5 * 1609.344 would give
 * 7242.048, and 1.1 * 1000 gives 1100.0000000000002.
 */
export function tenthsToM(tenths: number, units: Units): number {
  return units === "mi"
    ? Math.floor((tenths * MILLIMETRES_PER_MILE + 5_000) / 10_000)
    : tenths * 100;
}

/** A number with up to three decimals: a km written to the metre. */
const WRITTEN = /^(\d+)(?:[.,](\d{1,3}))?$/;

/**
 * The whole metres a field's text measures, in the unit it is written in
 * and with up to three decimals: "5" is 5000, "4.828" is 4828, "3 mi" is
 * 4828 too. Within no limits. Null when it is not a number.
 */
export function writtenM(text: string): number | null {
  const typed = readDistance(text);
  const match = WRITTEN.exec(typed.number.trim());
  if (!match) {
    return null;
  }
  const thousandths = Number(match[1]) * 1000 + Number((match[2] ?? "").padEnd(3, "0"));
  return typed.units === "mi"
    ? Math.floor((thousandths * MILLIMETRES_PER_MILE + 500_000) / 1_000_000)
    : thousandths;
}

/** The whole units nearest `metres`, held within `limits`. */
export function wholeUnits(
  metres: number,
  units: Units,
  [lowest, highest]: Limits,
): number {
  return Math.min(highest, Math.max(lowest, Math.round(metres / metresPer(units))));
}

/** The tenths of a unit nearest `metres`: 4828 m are 30 tenths of a mile. */
export function nearestTenths(metres: number, units: Units): number {
  return Math.round((metres / metresPer(units)) * 10);
}

/**
 * `metres` as the number a text says: in km the metres as they are (5,
 * 7.5), what the app wrote before the units; in miles to one decimal (4828
 * m are 3, 7242 m are 4.5).
 */
export function unitsNumber(metres: number, units: Units = appUnits()): number {
  return units === "mi" ? nearestTenths(metres, "mi") / 10 : metres / METRES_PER_KM;
}

/**
 * `metres` in miles to one decimal, never less than they are: what a word
 * needs "at least" stays true (9000 m are "5.6", not 5.59).
 */
export function milesAtLeast(metres: number): number {
  return Math.ceil((metres * 10) / METRES_PER_MILE - 1e-9) / 10;
}

/** Tenths as a number is typed: 30 is "3", 45 is "4.5" or "4,5". */
function tenthsText(tenths: number, separator = "."): string {
  const whole = Math.floor(tenths / 10);
  return tenths % 10 === 0 ? String(whole) : `${whole}${separator}${tenths % 10}`;
}

/** The tenths of `units` a field's text is: as typed when it is in them,
 * the nearest ones when it is written in the other unit. */
function tenthsIn(text: string, units: Units): number | null {
  const typed = readDistance(text);
  if (typed.units === units) {
    return typedTenths(typed.number);
  }
  const metres = writtenM(text);
  return metres === null ? null : nearestTenths(metres, units);
}

/**
 * What the field shows for its `text` while the app is in `units`: the
 * number as typed, without its unit; a text written in the other unit, the
 * same distance to one decimal ("5" km shows "3.1" in miles).
 */
export function shownNumber(text: string, units: Units = appUnits()): string {
  const typed = readDistance(text);
  if (typed.units === units) {
    return typed.number;
  }
  const metres = writtenM(text);
  return metres === null ? typed.number : tenthsText(nearestTenths(metres, units));
}

/**
 * The field's text after − (steps < 0) or + (steps > 0): one unit each,
 * held within `limits`. A value out of range is brought back into it; text
 * that is not a number starts from the lowest. The decimal keeps the
 * separator typed.
 */
export function steppedDistance(
  text: string,
  steps: number,
  units: Units,
  [lowest, highest]: Limits,
): string {
  const separator = text.includes(",") ? "," : ".";
  const tenths = tenthsIn(text, units);
  const next =
    tenths === null
      ? lowest * 10
      : Math.min(highest * 10, Math.max(lowest * 10, tenths + steps * 10));
  return writeDistance(tenthsText(next, separator), units);
}

/**
 * The field's text once the app turns to `units`: the same distance to the
 * nearest whole one, within `limits` (5 km are 3 mi, 3 mi are 5 km). Text
 * that is not a number stays as typed.
 */
export function switchedDistance(text: string, units: Units, limits: Limits): string {
  const metres = writtenM(text);
  return writeDistance(
    metres === null
      ? readDistance(text).number
      : String(wholeUnits(metres, units, limits)),
    units,
  );
}

/** The whole miles within `[lowestM, highestM]`, in metres: 1 to 21 km are
 * 1 to 13 mi, 10 to 30 km are 7 to 18. */
export function wholeMilesWithin(lowestM: number, highestM: number): Limits {
  return [Math.ceil(lowestM / METRES_PER_MILE), Math.floor(highestM / METRES_PER_MILE)];
}
