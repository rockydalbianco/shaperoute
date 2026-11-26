import { useEffect, useState, useSyncExternalStore } from "react";

import { energyReader } from "../health/energyModules";
import type { HealthEnergyReader, HealthWorkout } from "../health/energyReader";
import { keepHealthEnergyOn, loadHealthEnergyOn } from "./healthEnergyChoice";
import { addDays, type LocalDay, startOf } from "./localDay";

/**
 * What Apple Health has for the days «Nutrition» shows (TASK-489 part C2,
 * ADR-0397): the active energy of each day and the workouts other apps
 * recorded. Read on the phone each time a screen needs them and kept only
 * while that screen is there: never saved, never sent.
 *
 * Nothing is read before the user's yes («Use Apple Health»), and nothing
 * at all in a build without the reader (`health/energyModules.ts`).
 */

/** What Health has for a day. */
export type HealthDay = {
  /** The active energy of the day in kilocalories; null with none. */
  activeKcal: number | null;
  /** The workouts that began that day, whoever wrote them. */
  workouts: readonly HealthWorkout[];
};

export const NO_HEALTH_DAY: HealthDay = { activeKcal: null, workouts: [] };

/**
 * - "none": this build cannot read Apple Health; nothing is offered.
 * - "off": it can, and the user has not said yes.
 * - "on": the user said yes.
 */
export type HealthState = "none" | "off" | "on";

let on: boolean | null = null;
const listeners = new Set<() => void>();

function isOn(): boolean {
  on ??= loadHealthEnergyOn();
  return on;
}

function setOn(next: boolean): void {
  on = next;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Forgets what was read of the choice: for the tests. */
export function forgetHealthEnergy(): void {
  on = null;
  for (const listener of listeners) {
    listener();
  }
}

/**
 * «Use Apple Health»: the phone's sheet opens, and the yes is kept. Health
 * never says what was answered there: a no reads as days without data.
 */
export async function turnOnAppleHealth(
  reader: HealthEnergyReader | null = energyReader(),
): Promise<void> {
  if (reader === null) {
    return;
  }
  try {
    if (!(await reader.available())) {
      return;
    }
    await reader.ask();
  } catch {
    return;
  }
  if (keepHealthEnergyOn(true)) {
    setOn(true);
  }
}

/** «Stop using Apple Health»: the yes is forgotten on this phone. */
export function stopAppleHealth(): void {
  keepHealthEnergyOn(false);
  setOn(false);
}

/** What Health has from the start of `day` to the start of the next. */
async function readDay(reader: HealthEnergyReader, day: LocalDay): Promise<HealthDay> {
  const from = startOf(day);
  const to = startOf(addDays(day, 1));
  if (from === null || to === null) {
    return NO_HEALTH_DAY;
  }
  try {
    const [activeKcal, workouts] = await Promise.all([
      reader.activeEnergy(from.getTime(), to.getTime()),
      reader.workouts(from.getTime(), to.getTime()),
    ]);
    return { activeKcal, workouts };
  } catch {
    // A day that does not read is a day without data.
    return NO_HEALTH_DAY;
  }
}

export type HealthEnergy = {
  state: HealthState;
  /** What was read so far, by day; a day still being read is not here. */
  days: { readonly [day: string]: HealthDay };
};

const NOTHING_READ: { readonly [day: string]: HealthDay } = {};

/** The state of Apple Health for «Nutrition», and what it has for `days`. */
export function useHealthEnergy(
  days: readonly LocalDay[],
  reader: HealthEnergyReader | null = energyReader(),
): HealthEnergy {
  const yes = useSyncExternalStore(subscribe, isOn, isOn);
  const state: HealthState = reader === null ? "none" : yes ? "on" : "off";
  const [read, setRead] = useState(NOTHING_READ);
  const key = days.join(",");

  useEffect(() => {
    if (state !== "on" || reader === null || key === "") {
      return;
    }
    let live = true;
    for (const day of key.split(",")) {
      void readDay(reader, day).then((found) => {
        if (live) {
          setRead((was) => ({ ...was, [day]: found }));
        }
      });
    }
    return () => {
      live = false;
    };
  }, [state, reader, key]);

  return { state, days: state === "on" ? read : NOTHING_READ };
}
