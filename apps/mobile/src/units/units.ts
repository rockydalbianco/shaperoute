import { File, Paths } from "expo-file-system";

import { FOLLOWS_PHONE } from "./followsPhone";
import { phoneUnits } from "./phoneUnits";

/** What the app shows distances in (TASK-182): kilometres or miles. */
export type Units = "km" | "mi";

/** In the order «Settings» offers them. */
export const UNITS: readonly Units[] = ["km", "mi"];

export function isUnits(value: unknown): value is Units {
  return value === "km" || value === "mi";
}

/**
 * What «Settings» keeps: a unit, or "phone" to follow the phone's own
 * measurement system, which is what the app does until one is chosen
 * (ADR-0149), as with the language (ADR-0172).
 */
export type UnitsChoice = Units | "phone";

export const UNITS_FILE = "units.json";

/** The choice kept on this phone; "phone" when none was made or it does not read. */
export function loadUnitsChoice(): UnitsChoice {
  try {
    const file = new File(Paths.document, UNITS_FILE);
    if (!file.exists) {
      return "phone";
    }
    const data: unknown = JSON.parse(file.textSync());
    const units =
      typeof data === "object" && data !== null && "units" in data ? data.units : null;
    return isUnits(units) ? units : "phone";
  } catch {
    return "phone";
  }
}

/**
 * The units a choice shows the app in. With no choice made, the phone's
 * own once the app follows them (`FOLLOWS_PHONE`), kilometres until then.
 */
export function unitsOf(choice: UnitsChoice, phone: () => Units = phoneUnits): Units {
  if (choice !== "phone") {
    return choice;
  }
  return FOLLOWS_PHONE ? phone() : "km";
}

/** The app's units now; read from the phone on first use. */
let current: Units | null = null;

/** The units the app shows distances in now. */
export function appUnits(): Units {
  if (current === null) {
    current = unitsOf(loadUnitsChoice());
  }
  return current;
}

/** Told of each new unit, while the app is open. */
const listeners = new Set<(units: Units) => void>();

/**
 * Calls `listener` with each unit the app turns to from now on, until the
 * returned function is called: the app follows «Settings» at once.
 */
export function subscribeUnits(listener: (units: Units) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Keeps the choice for the next opening and shows the app in it now; a
 * phone that refuses to keep it still has it until the app closes.
 */
export function saveUnitsChoice(choice: UnitsChoice): void {
  try {
    const file = new File(Paths.document, UNITS_FILE);
    if (choice === "phone") {
      if (file.exists) {
        file.delete();
      }
    } else {
      file.create({ overwrite: true });
      file.write(JSON.stringify({ units: choice }));
    }
  } catch {
    // The choice still holds while the app is open.
  }
  const units = unitsOf(choice);
  if (units === current) {
    return;
  }
  current = units;
  for (const listener of listeners) {
    listener(units);
  }
}
