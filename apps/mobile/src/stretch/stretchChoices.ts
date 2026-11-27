import { File, Paths } from "expo-file-system";
import { useSyncExternalStore } from "react";

import type { Category } from "./categories";
import { type Choice, defaultChoice, settle } from "./compose";

/**
 * The last choice made for each stretching category (TASK-520, ADR-0415):
 * its length, gentle or intense, with a mat or standing only. A category
 * opens on it the next time; one never opened opens on five minutes, gentle,
 * with a mat. Kept on this phone only, by the category's key, and settled on
 * what the category offers each time it is read: a choice kept by a version
 * that offered something else never asks for a routine there is not.
 */

export const CHOICES_FILE = "stretch-choices.json";

type Kept = Readonly<Record<string, Choice>>;

/** What a kept file holds, anything else left out. */
export function choicesOf(data: unknown): Kept {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return {};
  }
  const out: Record<string, Choice> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (typeof value !== "object" || value === null) {
      continue;
    }
    const { minutes, level, where } = value as Record<string, unknown>;
    if (
      typeof minutes === "number" &&
      Number.isFinite(minutes) &&
      (level === "gentle" || level === "intense") &&
      (where === "any" || where === "standing")
    ) {
      out[key] = { minutes, level, where };
    }
  }
  return out;
}

function load(): Kept {
  try {
    const file = new File(Paths.document, CHOICES_FILE);
    if (!file.exists) {
      return {};
    }
    return choicesOf(JSON.parse(file.textSync()));
  } catch {
    return {};
  }
}

let current: Kept | null = null;
const listeners = new Set<() => void>();

function kept(): Kept {
  if (current === null) {
    current = load();
  }
  return current;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The choice a category opens on: the last one made, or its first. */
export function choiceFor(of: Category, choices: Kept = kept()): Choice {
  const last = choices[of.key];
  return last === undefined ? defaultChoice(of) : settle(of, last);
}

/** Keeps a category's choice for the next time; a phone that refuses to
 * keep it still has it until the app closes. */
export function rememberChoice(of: Category, choice: Choice): void {
  const next = { ...kept(), [of.key]: settle(of, choice) };
  try {
    const file = new File(Paths.document, CHOICES_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify(next));
  } catch {
    // The choice still holds while the app is open.
  }
  current = next;
  for (const listener of listeners) {
    listener();
  }
}

/** The choices kept, following each new one. */
export function useChoices(): Kept {
  return useSyncExternalStore(subscribe, kept, kept);
}

/** Forgets what was read from the phone: for the tests. */
export function resetChoicesForTests(): void {
  current = null;
}
