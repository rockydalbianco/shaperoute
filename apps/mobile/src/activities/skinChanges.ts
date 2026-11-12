import { File, Paths } from "expo-file-system";
import { useSyncExternalStore } from "react";

/**
 * The changeovers a ski tourer marks by hand (TASK-415 part B3, the user's
 * choice of 2026-11-12, «Un pulsante a mano»): «Changeover» in the panel of
 * the tour starts one, «Resume» or moving on ends it. They count over the
 * ones found from the track (`mountainPhases.ts`). One file for the phone,
 * for the tour in progress: a tour is told by the time of its first fix,
 * and the marks of another tour are not its own. Nothing is sent.
 */

export const SKIN_CHANGES_FILE = "skin-changes.json";

/** A changeover marked by hand; open while `toMs` is null. */
export type SkinChange = { fromMs: number; toMs: number | null };

type Kept = { tourMs: number; changes: SkinChange[] };

const NONE: readonly SkinChange[] = [];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function changesOf(value: unknown): SkinChange[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item): SkinChange[] =>
    isObject(item) &&
    typeof item.fromMs === "number" &&
    (item.toMs === null || typeof item.toMs === "number")
      ? [{ fromMs: item.fromMs, toMs: item.toMs }]
      : [],
  );
}

function load(): Kept | null {
  try {
    const file = new File(Paths.document, SKIN_CHANGES_FILE);
    if (!file.exists) {
      return null;
    }
    const data: unknown = JSON.parse(file.textSync());
    return isObject(data) && typeof data.tourMs === "number"
      ? { tourMs: data.tourMs, changes: changesOf(data.changes) }
      : null;
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();
/** What the file says, read once and then kept with every save. */
let kept: Kept | null | undefined;

function current(): Kept | null {
  if (kept === undefined) {
    kept = load();
  }
  return kept;
}

function save(next: Kept): void {
  kept = next;
  try {
    const file = new File(Paths.document, SKIN_CHANGES_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify(next));
  } catch {
    // The tour goes on with the marks in memory.
  }
  for (const listener of listeners) {
    listener();
  }
}

/** The changeovers marked on the tour that began at `tourMs`. */
export function loadSkinChanges(tourMs: number | null): readonly SkinChange[] {
  const read = current();
  return tourMs === null || read === null || read.tourMs !== tourMs
    ? NONE
    : read.changes;
}

/** The changeover marked and not ended yet, if any. */
export function openSkinChange(changes: readonly SkinChange[]): SkinChange | null {
  const last = changes[changes.length - 1];
  return last !== undefined && last.toMs === null ? last : null;
}

/** A changeover starts at `atMs`; nothing when one is open already. */
export function startSkinChange(tourMs: number, atMs: number): void {
  const changes = loadSkinChanges(tourMs);
  if (openSkinChange(changes) !== null) {
    return;
  }
  save({ tourMs, changes: [...changes, { fromMs: atMs, toMs: null }] });
}

/** The open changeover ends at `atMs`; nothing when none is open. */
export function endSkinChange(tourMs: number, atMs: number): void {
  const changes = loadSkinChanges(tourMs);
  const open = openSkinChange(changes);
  if (open === null) {
    return;
  }
  save({
    tourMs,
    changes: [...changes.slice(0, -1), { ...open, toMs: Math.max(open.fromMs, atMs) }],
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The changeovers marked on the tour that began at `tourMs`, kept up to
 * date as they are marked. */
export function useSkinChanges(tourMs: number | null): readonly SkinChange[] {
  return useSyncExternalStore(subscribe, () => loadSkinChanges(tourMs));
}

/** For the tests: forget what was read, as a new start of the app. */
export function forgetSkinChanges(): void {
  kept = undefined;
}
