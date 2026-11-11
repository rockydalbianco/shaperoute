import { File, Paths } from "expo-file-system";
import { useSyncExternalStore } from "react";

import { subscribeSport } from "../settings/sport";

/**
 * «Your plan, step by step» (TASK-433 B, the user's choices of 2026-11-10):
 * the sheet that says how the guided plans work comes up only the first
 * time «Gym» is touched in «Draw», never when the app opens with the gym
 * chosen already and never for another sport. So it listens to the sport
 * chosen (saveSport tells only of a choice made), not to the gym's page
 * coming on screen. Once shown it is kept as seen on the phone, and comes
 * back only from «How plans work».
 */

export const INTRO_FILE = "gym-intro.json";

let seenCache: boolean | null = null;
// Gym touched, the sheet not shown yet; or opened again by hand.
let open = false;
const listeners = new Set<() => void>();

function seen(): boolean {
  if (seenCache === null) {
    try {
      const file = new File(Paths.document, INTRO_FILE);
      seenCache = file.exists && JSON.parse(file.textSync())?.seen === true;
    } catch {
      seenCache = false;
    }
  }
  return seenCache;
}

function keepSeen(): void {
  seenCache = true;
  try {
    const file = new File(Paths.document, INTRO_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify({ seen: true }));
  } catch {
    // Seen while the app is open: at worst it shows once more.
  }
}

function tell(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** «Gym» touched: the sheet comes up, if it never did. */
export function gymTouched(): void {
  if (!seen()) {
    open = true;
    tell();
  }
}

// From the app's start: the sport chosen from now on, by a touch.
subscribeSport((sport) => {
  if (sport === "gym") {
    gymTouched();
  }
});

/** «How plans work»: the sheet again, whenever asked. */
export function showGymIntro(): void {
  open = true;
  tell();
}

/** Closed («Not now», «Create my plan», swiped down): seen for good. */
export function closeGymIntro(): void {
  keepSeen();
  open = false;
  tell();
}

/** For the tests: never seen, closed, the file read again. */
export function forgetGymIntro(): void {
  seenCache = null;
  open = false;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isOpen(): boolean {
  return open;
}

/** Whether the sheet is up. */
export function useGymIntro(): boolean {
  return useSyncExternalStore(subscribe, isOpen, isOpen);
}
