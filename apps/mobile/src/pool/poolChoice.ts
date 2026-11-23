import { useEffect, useState } from "react";

import { keptList } from "../storage/keptList";
import { isPoolLength } from "./poolSwim";

/**
 * What the phone keeps of the swims in a pool (TASK-400 part B, ADR-0334):
 * «Open water» or «Pool», the last chosen, and the pool, proposed the next
 * time (points 1 and 2); the paces of the last swims in a pool, for the
 * estimate of «How many lengths?» (point 3). In one file of the documents.
 */

export const POOL_CHOICE_FILE = "pool-choice.json";

/** Where the swim is: in open water, as before TASK-400, or in a pool. */
export type SwimPlace = "open_water" | "pool";

/** The two pools that have a button; «Other» is any from 10 to 100 m. */
export const POOL_LENGTHS_M: readonly number[] = [25, 50];

/** How many paces the estimate averages: the last swims, not all. */
export const PACES_KEPT = 5;

export type PoolChoice = {
  place: SwimPlace;
  poolLengthM: number;
  /** Seconds per 100 m of the last swims in a pool, the latest last. */
  paces: number[];
};

const FIRST: PoolChoice = { place: "open_water", poolLengthM: 25, paces: [] };

function isChoice(value: unknown): value is PoolChoice {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { place, poolLengthM, paces } = value as Record<string, unknown>;
  return (
    (place === "open_water" || place === "pool") &&
    typeof poolLengthM === "number" &&
    isPoolLength(poolLengthM) &&
    Array.isArray(paces) &&
    paces.every((pace) => typeof pace === "number" && Number.isFinite(pace) && pace > 0)
  );
}

const kept = keptList(POOL_CHOICE_FILE, isChoice);

/** What the phone keeps; open water and 25 m the first time. */
export function loadPoolChoice(): PoolChoice {
  return kept.load()[0] ?? FIRST;
}

/** Told of each change, while the app is open: «Draw» follows at once. */
const listeners = new Set<(choice: PoolChoice) => void>();

function put(change: (choice: PoolChoice) => PoolChoice): void {
  const next = change(loadPoolChoice());
  // A phone that refuses keeps nothing: the choice still holds while open.
  kept.save([next]);
  for (const listener of [...listeners]) {
    listener(next);
  }
}

export function savePlace(place: SwimPlace): void {
  put((choice) => ({ ...choice, place }));
}

/** The pool chosen; one out of 10–100 m is not kept. */
export function savePoolLength(poolLengthM: number): void {
  if (isPoolLength(poolLengthM)) {
    put((choice) => ({ ...choice, poolLengthM }));
  }
}

/** The pace of a swim saved, for the next estimates. */
export function keepPace(paceS100: number): void {
  if (Number.isFinite(paceS100) && paceS100 > 0) {
    put((choice) => ({
      ...choice,
      paces: [...choice.paces, paceS100].slice(-PACES_KEPT),
    }));
  }
}

/** The average pace of the last swims in a pool; null before the first. */
export function averagePace(choice: PoolChoice = loadPoolChoice()): number | null {
  return choice.paces.length === 0
    ? null
    : choice.paces.reduce((total, pace) => total + pace, 0) / choice.paces.length;
}

/** The choice, and «Draw» drawn again when it changes. */
export function usePoolChoice(): PoolChoice {
  const [choice, setChoice] = useState(loadPoolChoice);
  useEffect(() => {
    listeners.add(setChoice);
    return () => {
      listeners.delete(setChoice);
    };
  }, []);
  return choice;
}
