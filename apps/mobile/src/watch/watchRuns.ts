import * as Notifications from "expo-notifications";
import { File } from "expo-file-system";

import { t } from "../i18n";
import { type KeptList, keptList } from "../storage/keptList";
import type { WatchFile, WatchFiles } from "./watchLink";
import { decodeWatchTrack, type WatchTrack } from "./watchTrack";

/**
 * The workouts of the Apple Watch waiting on the phone (TASK-370 part B3c2,
 * ADR-0314; the user's choice «Avviso e scheda»): each file the watch sends
 * is kept here, a notification says it is ready, and a card on top of «My
 * activities» shows it until it is opened, to the end of a run of always,
 * or let go of. Kept in a file of the app, so it waits across openings.
 */

/** The file, in the app's documents, with a copy beside it (keptList). */
export const WATCH_RUNS_FILE = "watch-runs.json";

/** At most this many wait: an older one is let go of. */
export const WATCH_RUNS_KEPT = 10;

/** A workout waiting: the file's JSON as the watch wrote it, read again
 * whenever it is shown, so a file the app no longer reads is left out. */
type Kept = { id: string; receivedAtMs: number; file: unknown };

export type PendingWatchRun = { id: string; receivedAtMs: number; track: WatchTrack };

function isKept(value: unknown): value is Kept {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const { id, receivedAtMs, file } = value as Record<string, unknown>;
  return (
    typeof id === "string" &&
    typeof receivedAtMs === "number" &&
    decodeWatchTrack(file).ok
  );
}

/** What the app keeps and how it tells: the tests put their own. */
export type WatchRunDoors = {
  store: KeptList<Kept>;
  /** The file's text; null when it cannot be read. */
  read: (url: string) => string | null;
  remove: (url: string) => void;
  notify: () => Promise<void>;
  now: () => number;
};

export const PHONE_WATCH_RUN_DOORS: WatchRunDoors = {
  store: keptList(WATCH_RUNS_FILE, isKept),
  read(url) {
    try {
      return new File(url).textSync();
    } catch {
      return null;
    }
  },
  remove(url) {
    try {
      new File(url).delete();
    } catch {
      // Gone already: nothing to remove.
    }
  },
  async notify() {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t("Your activity from the watch is ready"),
          body: t("Open MuW to save it."),
          data: { kind: "watch_run" },
        },
        trigger: null,
      });
    } catch {
      // Not allowed: the card in «My activities» still shows it.
    }
  },
  now: Date.now,
};

const listeners = new Set<() => void>();

function changed(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Called whenever the workouts waiting change; returns the function that
 * stops. */
export function subscribeWatchRuns(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The workouts waiting, the newest first. */
export function pendingWatchRuns(
  doors: WatchRunDoors = PHONE_WATCH_RUN_DOORS,
): PendingWatchRun[] {
  return doors.store
    .load()
    .flatMap(({ id, receivedAtMs, file }) => {
      const read = decodeWatchTrack(file);
      return read.ok ? [{ id, receivedAtMs, track: read.track }] : [];
    })
    .sort((a, b) => b.receivedAtMs - a.receivedAtMs);
}

/**
 * A file of the watch: a workout is kept and told about, then the file is
 * removed and given back as done. Another file, or one that does not read,
 * is only given back. True when a workout was kept.
 */
export async function receiveWatchFile(
  file: WatchFile,
  files: Pick<WatchFiles, "done">,
  doors: WatchRunDoors = PHONE_WATCH_RUN_DOORS,
): Promise<boolean> {
  let kept = false;
  if (file.metadata.type === "track") {
    const text = doors.read(file.url);
    let json: unknown = null;
    try {
      json = text === null ? null : JSON.parse(text);
    } catch {
      json = null;
    }
    if (decodeWatchTrack(json).ok) {
      const list = doors.store.load().filter((run) => run.id !== file.id);
      const next = [{ id: file.id, receivedAtMs: doors.now(), file: json }, ...list]
        .sort((a, b) => b.receivedAtMs - a.receivedAtMs)
        .slice(0, WATCH_RUNS_KEPT);
      kept = doors.store.save(next);
    }
  }
  doors.remove(file.url);
  files.done(file.id);
  if (kept) {
    changed();
    await doors.notify();
  }
  return kept;
}

/** A workout let go of: opened to the end of a run, or discarded. */
export function forgetWatchRun(
  id: string,
  doors: WatchRunDoors = PHONE_WATCH_RUN_DOORS,
): void {
  doors.store.save(doors.store.load().filter((run) => run.id !== id));
  changed();
}

type Opener = (run: PendingWatchRun) => void;

let opener: Opener | null = null;

/** Where «Open» takes a workout: the app's end of a run (App.tsx). */
export function setWatchRunOpener(open: Opener | null): void {
  opener = open;
}

/** «Open» on the card: the workout leaves the waiting ones and the app
 * shows it as the end of a run. */
export function openWatchRun(
  run: PendingWatchRun,
  doors: WatchRunDoors = PHONE_WATCH_RUN_DOORS,
): void {
  if (opener === null) {
    return;
  }
  forgetWatchRun(run.id, doors);
  opener(run);
}
