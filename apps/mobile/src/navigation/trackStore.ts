import type { LatLon } from "@shaperoute/shared-types";
import { File, Paths } from "expo-file-system";

import { addFix, emptyTrack, type Track, type TrackFix } from "./trackRecorder";

/**
 * The run in progress, kept in a file of the app's documents (TASK-112,
 * ADR-0091): it is still there after the app is closed, and it never
 * leaves the phone. One run at a time: a new one replaces the last.
 */

export const RUN_FILE = "current-run.json";
/** The file is written at most this often, and when the run ends. */
export const SAVE_EVERY_MS = 15_000;
/** A run stopped less than this ago goes on when the same route starts again. */
export const RESUME_WITHIN_MS = 30 * 60_000;

/** "running" in the file means the app was closed during the run. */
export type RunStatus = "running" | "stopped" | "arrived";

export type SavedRun = {
  version: 1;
  /** The planned route the run follows. */
  route: LatLon[];
  /** How much that route looks like its shape (RouteResult.similarity):
   * the score needs it (ADR-0090). Absent in a file older than TASK-113. */
  similarity?: number;
  track: Track;
  status: RunStatus;
};

function runFile(): File {
  return new File(Paths.document, RUN_FILE);
}

/** Writes the run; false when the phone refuses (full, no access). */
export function saveRun(run: SavedRun): boolean {
  try {
    const file = runFile();
    file.create({ overwrite: true });
    file.write(JSON.stringify(run));
    return true;
  } catch {
    return false;
  }
}

/** The run in the file, or null when there is none or it cannot be read. */
export function loadRun(): SavedRun | null {
  try {
    const file = runFile();
    if (!file.exists) {
      return null;
    }
    const data: unknown = JSON.parse(file.textSync());
    return isSavedRun(data) ? data : null;
  } catch {
    return null;
  }
}

export function clearRun(): void {
  try {
    const file = runFile();
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Nothing to clear is as good as cleared.
  }
}

function isLatLon(value: unknown): value is LatLon {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
}

function isFix(value: unknown): value is TrackFix {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const fix = value as Record<string, unknown>;
  return (
    isLatLon(fix.point) &&
    typeof fix.timeMs === "number" &&
    (fix.accuracyM === null || typeof fix.accuracyM === "number")
  );
}

function isSavedRun(value: unknown): value is SavedRun {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const run = value as Record<string, unknown>;
  const track = run.track as Record<string, unknown> | null | undefined;
  return (
    run.version === 1 &&
    Array.isArray(run.route) &&
    run.route.every(isLatLon) &&
    (run.similarity === undefined || typeof run.similarity === "number") &&
    (run.status === "running" ||
      run.status === "stopped" ||
      run.status === "arrived") &&
    typeof track === "object" &&
    track !== null &&
    typeof track.distanceM === "number" &&
    Array.isArray(track.fixes) &&
    track.fixes.every(isFix)
  );
}

function sameRoute(a: LatLon[], b: LatLon[]): boolean {
  return (
    a.length === b.length &&
    a.every(([lat, lon], i) => lat === b[i][0] && lon === b[i][1])
  );
}

/** The saved track when it is an unfinished run of `route`, stopped lately. */
function resumable(
  saved: SavedRun | null,
  route: LatLon[],
  nowMs: number,
): Track | null {
  if (saved === null || saved.status === "arrived" || !sameRoute(saved.route, route)) {
    return null;
  }
  const last = saved.track.fixes[saved.track.fixes.length - 1];
  if (last === undefined || nowMs - last.timeMs > RESUME_WITHIN_MS) {
    return null;
  }
  return saved.track;
}

export type RunRecorder = {
  /** A fix from the GPS; `arrived` when the navigator says the run is over. */
  onFix(fix: TrackFix, arrived: boolean): void;
  /** The run is left: what there is goes to the file. */
  stop(): void;
  track(): Track;
};

/**
 * Records the run along `route` and keeps the file up to date. Starting
 * again the route of a run stopped lately goes on with its track; anything
 * else in the file is replaced at the first fix kept.
 */
export function startRun(
  route: LatLon[],
  nowMs: number,
  similarity?: number,
): RunRecorder {
  let track = resumable(loadRun(), route, nowMs) ?? emptyTrack();
  let status: RunStatus = "running";
  let savedMs: number | null = null;
  let unsaved = false;

  function save(): void {
    saveRun({ version: 1, route, similarity, track, status });
    unsaved = false;
  }

  const recorder: RunRecorder = {
    onFix(fix, arrived) {
      if (status === "arrived") {
        return;
      }
      const next = addFix(track, fix);
      unsaved = unsaved || next !== track;
      track = next;
      if (arrived) {
        status = "arrived";
        save();
        return;
      }
      if (unsaved && (savedMs === null || fix.timeMs - savedMs >= SAVE_EVERY_MS)) {
        savedMs = fix.timeMs;
        save();
      }
    },
    stop() {
      if (status === "running" && track.fixes.length > 0) {
        status = "stopped";
        save();
      }
    },
    track: () => track,
  };
  active = recorder;
  return recorder;
}

/** The recorder of the run in progress, if navigation started one. */
let active: RunRecorder | null = null;

/** A run with enough in it to ask for a score: a line, and the route's
 * similarity. */
export type ScorableRun = SavedRun & { similarity: number };

/** The run in the file when it can be scored, or null. */
export function pendingRun(): ScorableRun | null {
  const run = loadRun();
  return run !== null && run.similarity !== undefined && run.track.fixes.length > 1
    ? { ...run, similarity: run.similarity }
    : null;
}

/**
 * Ends the run in progress, writing what there is, and gives it back when
 * it can be scored (TASK-113): for the finish screen, before navigation
 * itself has stopped.
 */
export function endRun(): ScorableRun | null {
  active?.stop();
  active = null;
  return pendingRun();
}
