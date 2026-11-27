import { dayLabel, MONTHS } from "../activities/activityText";
import { weightIn, weightLabel, weightUnit } from "../body/bodyUnits";
import { valueIn, type WeightMode } from "../body/weighIns";
import { decimal, t } from "../i18n";
import type { Units } from "../units/units";
import { type LocalDay, startOf } from "./localDay";

/** The weight page in words (TASK-489 part K1): days, changes, percents. */

/** «4 Sep», or the whole day with its year when it is of another year. */
export function shortDay(day: LocalDay, today: LocalDay): string {
  const date = startOf(day);
  if (date === null) {
    return "";
  }
  if (day.slice(0, 4) !== today.slice(0, 4)) {
    return dayLabel(date.toISOString());
  }
  return t("{day} {month}", {
    day: String(date.getDate()),
    month: t(MONTHS[date.getMonth()]),
  });
}

function signOf(value: number): string {
  return value > 0 ? "+" : value < 0 ? "−" : "";
}

function tenth(value: number): string {
  return Number.isInteger(value) ? String(value) : decimal(value, 1);
}

/** «−2.8 kg», «+1.2 lb», «0 kg»: a change of weight with a true minus. */
export function signedWeight(kg: number, units: Units): string {
  const value = weightIn(Math.abs(kg), units);
  return `${value === 0 ? "" : signOf(kg)}${tenth(value)} ${weightUnit(units)}`;
}

/** «−3.4 %». */
export function signedPercent(percent: number): string {
  const value = Math.round(Math.abs(percent) * 10) / 10;
  return `${value === 0 ? "" : signOf(percent)}${tenth(value)} %`;
}

/** A weigh-in as the chart reads it in `mode`. */
export function modeLabel(
  mode: WeightMode,
  kg: number,
  startKg: number,
  units: Units,
): string {
  if (mode === "kg") {
    return weightLabel(kg, units);
  }
  const value = valueIn(mode, kg, startKg);
  return mode === "change" ? signedWeight(value, units) : signedPercent(value);
}
