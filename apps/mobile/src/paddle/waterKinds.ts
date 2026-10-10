import { File, Paths } from "expo-file-system";

import type { WaterKind } from "./waterPlaces";

/**
 * The filter of «LAKES AND SEA» (TASK-269, ADR-0239): «Lakes» and «Sea»,
 * both on at first. Tapping one with both on leaves it alone; tapping the
 * one alone turns both on again; tapping the other one moves to it. Kept on
 * the phone.
 */
export type WaterFilter = "all" | WaterKind;

export const WATER_FILTER_FILE = "water-filter.json";

/** Whether the places of `kind` are shown with `filter`. */
export function shows(filter: WaterFilter, kind: WaterKind): boolean {
  return filter === "all" || filter === kind;
}

/** The filter after a tap on the chip of `kind`. */
export function tapped(filter: WaterFilter, kind: WaterKind): WaterFilter {
  return filter === kind ? "all" : kind;
}

function isFilter(value: unknown): value is WaterFilter {
  return value === "all" || value === "lake" || value === "sea";
}

/** The filter kept on the phone; both kinds when none was kept. */
export function loadWaterFilter(): WaterFilter {
  try {
    const file = new File(Paths.document, WATER_FILTER_FILE);
    if (!file.exists) {
      return "all";
    }
    const data: unknown = JSON.parse(file.textSync());
    const filter =
      typeof data === "object" && data !== null && "filter" in data
        ? data.filter
        : null;
    return isFilter(filter) ? filter : "all";
  } catch {
    return "all";
  }
}

export function saveWaterFilter(filter: WaterFilter): void {
  try {
    const file = new File(Paths.document, WATER_FILTER_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify({ filter }));
  } catch {
    // A convenience: the next opening shows both kinds.
  }
}
