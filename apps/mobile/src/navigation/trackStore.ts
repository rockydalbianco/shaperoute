import {
  ACTIVITIES,
  type Activity,
  type LatLon,
  type Walk,
} from "@shaperoute/shared-types";
import { File, Paths } from "expo-file-system";

import {
  addFix,
  continueTrack,
  emptyTrack,
  leaveTrack,
  pauseTrack,
  penDownTrack,
  penUpTrack,
  resumeTrack,
  type Track,
  type TrackFix,
} from "./trackRecorder";

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
/** With the app behind another, or the phone locked, no fix for this long
 * is a pause of the phone's (TASK-255, ADR-0219: the user's choice of 60
 * seconds): a shorter absence, a change of song, joins the line as before. */
export const AWAY_AFTER_MS = 60_000;

/** "running" in the file means the app was closed during the run. */
export type RunStatus = "running" | "stopped" | "arrived";

export type SavedRun = {
  version: 1;
  /** The planned route the run follows. */
  route: LatLon[];
  /** How much that route looks like its shape (RouteResult.similarity):
   * the score needs it (ADR-0090). Absent in a file older than TASK-113. */
  similarity?: number;
  /** The route's walks, for a word with the pen up (TASK-198): the score
   * leaves them out. Absent for any other route, and before TASK-198. */
  walks?: Walk[];
  /** What the route is for, when it is not a run's (TASK-251): the end of
   * a run on the water writes a paddler's pace. Absent for a run, and
   * before TASK-251. */
  activity?: Activity;
  /** How far the route's shape is turned (RouteResult.rotation_deg,
   * TASK-232): the run saved and its post show the drawing turned back.
   * Absent for a route north up, and before TASK-232 part C. */
  rotation_deg?: number;
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
    (fix.accuracyM === null || typeof fix.accuracyM === "number") &&
    (fix.altitudeM === undefined ||
      fix.altitudeM === null ||
      typeof fix.altitudeM === "number") &&
    (fix.gap === undefined || fix.gap === true)
  );
}

function isPause(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const pause = value as Record<string, unknown>;
  return (
    typeof pause.fromMs === "number" &&
    (pause.toMs === null || typeof pause.toMs === "number") &&
    (pause.auto === undefined || pause.auto === true) &&
    (pause.pen === undefined || pause.pen === true) &&
    (pause.away === undefined || pause.away === true)
  );
}

function isWalk(value: unknown): value is Walk {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((index) => Number.isInteger(index))
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
    (run.walks === undefined ||
      (Array.isArray(run.walks) && run.walks.every(isWalk))) &&
    (run.activity === undefined ||
      (ACTIVITIES as readonly unknown[]).includes(run.activity)) &&
    (run.rotation_deg === undefined || typeof run.rotation_deg === "number") &&
    (run.status === "running" ||
      run.status === "stopped" ||
      run.status === "arrived") &&
    typeof track === "object" &&
    track !== null &&
    typeof track.distanceM === "number" &&
    Array.isArray(track.fixes) &&
    track.fixes.every(isFix) &&
    // Absent in a file older than TASK-169.
    (track.pauses === undefined ||
      (Array.isArray(track.pauses) && track.pauses.every(isPause)))
  );
}

function sameRoute(a: LatLon[], b: LatLon[]): boolean {
  return (
    a.length === b.length &&
    a.every(([lat, lon], i) => lat === b[i][0] && lon === b[i][1])
  );
}

/** The saved track when it is an unfinished run of `route`, stopped lately:
 * it goes on from `nowMs`, and the time in between is a pause (TASK-169). */
function resumable(
  saved: SavedRun | null,
  route: LatLon[],
  nowMs: number,
): Track | null {
  if (saved === null || saved.status === "arrived" || !sameRoute(saved.route, route)) {
    return null;
  }
  // One fix alone is no run to go on with (TASK-252): a start taken back
  // at once would become the first point of the next run, wherever it is.
  if (saved.track.fixes.length < 2) {
    return null;
  }
  const last = saved.track.fixes[saved.track.fixes.length - 1];
  if (nowMs - last.timeMs > RESUME_WITHIN_MS) {
    return null;
  }
  return continueTrack(saved.track, nowMs);
}

export type RunRecorder = {
  /** A fix from the GPS; `arrived` when the navigator says the run is over. */
  onFix(fix: TrackFix, arrived: boolean): void;
  /** The run waits from `nowMs` (TASK-169): by the runner's hand, or `auto`
   * when the runner stands still. Until it goes on, time does not count. */
  pause(nowMs: number, auto?: boolean): void;
  /** The run goes on from `nowMs`. */
  resume(nowMs: number): void;
  /** The pen is lifted at the end of a letter (TASK-198): the run waits
   * from `nowMs`, a pause of the pen's, unless the runner paused it. */
  liftPen(nowMs: number): void;
  /** The next letter starts: the pen's pause ends at `nowMs`; any other
   * pause stays. */
  lowerPen(nowMs: number): void;
  /** The app leaves the front (TASK-255): if the next fix then comes more
   * than AWAY_AFTER_MS after the last, the run waited from `nowMs`, a pause
   * of the phone's, unless the runner or the pen paused it; a fix sooner
   * (a change of song, a glance at a notification) joins the line as
   * before. */
  leave(nowMs: number): void;
  /** The run is left: what there is goes to the file. */
  stop(): void;
  track(): Track;
};

/**
 * Records the run along `route` and keeps the file up to date. Starting
 * again the route of a run stopped lately goes on with its track; anything
 * else in the file is replaced at the first fix kept. `walks` are the
 * route's, for a word with the pen up (TASK-198): kept for the score.
 * `activity` is the route's, kept when it is not a run's (TASK-251).
 * `rotationDeg` is how far the route's shape is turned, kept when it is
 * (TASK-232): the run saved shows the drawing turned back.
 */
export function startRun(
  route: LatLon[],
  nowMs: number,
  similarity?: number,
  walks: readonly Walk[] = [],
  activity?: Activity,
  rotationDeg?: number,
): RunRecorder {
  let track = resumable(loadRun(), route, nowMs) ?? emptyTrack();
  let status: RunStatus = "running";
  let savedMs: number | null = null;
  let unsaved = false;

  // Only with walks: the file of any other run is as it was.
  const walked =
    walks.length > 0 ? { walks: walks.map(([from, to]): Walk => [from, to]) } : {};
  // Only when it is not a run: the file of a run is as it was.
  const sport = activity === undefined || activity === "running" ? {} : { activity };
  // Only when the shape is turned: the file of any other route is as it was.
  const turned =
    typeof rotationDeg === "number" && Number.isFinite(rotationDeg) && rotationDeg !== 0
      ? { rotation_deg: rotationDeg }
      : {};

  // The run as it would be in the file, when the last write failed.
  let notWritten: SavedRun | null = null;

  function save(): void {
    const run: SavedRun = {
      version: 1,
      route,
      similarity,
      ...walked,
      ...sport,
      ...turned,
      track,
      status,
    };
    notWritten = saveRun(run) ? null : run;
    unsaved = false;
  }

  // When the app left the front, until the first fix after (TASK-255).
  let leftAtMs: number | null = null;

  const recorder: RunRecorder = {
    onFix(fix, arrived) {
      if (status === "arrived") {
        return;
      }
      if (leftAtMs !== null) {
        const last = track.fixes[track.fixes.length - 1];
        // Away long enough that nothing of it was the run (the user's
        // choice, ADR-0219): a pause from then, and a new stretch now.
        // Unless the runner, or the pen, paused the run over the absence
        // anyway: that pause already says so.
        if (
          last !== undefined &&
          fix.timeMs - last.timeMs > AWAY_AFTER_MS &&
          !pausedByHandAfter(track, last.timeMs)
        ) {
          track = leaveTrack(track, leftAtMs);
        }
        leftAtMs = null;
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
    pause(nowMs, auto = false) {
      const next = pauseTrack(track, nowMs, auto);
      // A pause is rare and worth keeping: written at once.
      if (status === "running" && next !== track) {
        track = next;
        if (track.fixes.length > 0) {
          save();
        }
      }
    },
    resume(nowMs) {
      const next = resumeTrack(track, nowMs);
      if (status === "running" && next !== track) {
        track = next;
        unsaved = true;
      }
    },
    liftPen(nowMs) {
      const next = penUpTrack(track, nowMs);
      // Written at once, as a pause is.
      if (status === "running" && next !== track) {
        track = next;
        if (track.fixes.length > 0) {
          save();
        }
      }
    },
    lowerPen(nowMs) {
      const next = penDownTrack(track, nowMs);
      if (status === "running" && next !== track) {
        track = next;
        unsaved = true;
      }
    },
    leave(nowMs) {
      if (status === "running") {
        leftAtMs = nowMs;
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
  activeNotWritten = () => notWritten;
  return recorder;
}

/** Whether a pause of the runner's, or of the pen's, reaches past `sinceMs`. */
function pausedByHandAfter(track: Track, sinceMs: number): boolean {
  return (track.pauses ?? []).some(
    (pause) =>
      pause.auto !== true &&
      pause.away !== true &&
      (pause.toMs === null || pause.toMs > sinceMs),
  );
}

/** The recorder of the run in progress, if navigation started one. */
let active: RunRecorder | null = null;
/** The run of that recorder, when the phone refused its last write. */
let activeNotWritten: () => SavedRun | null = () => null;

/** A run with enough in it to ask for a score: a line, and the route's
 * similarity. */
export type ScorableRun = SavedRun & { similarity: number };

function scorable(run: SavedRun | null): ScorableRun | null {
  return run !== null && run.similarity !== undefined && run.track.fixes.length > 1
    ? { ...run, similarity: run.similarity }
    : null;
}

/** The run in the file when it can be scored, or null. */
export function pendingRun(): ScorableRun | null {
  return scorable(loadRun());
}

/**
 * Ends the run in progress, writing what there is, and gives back what was
 * recorded. From the file, as ever; from memory when the phone refused the
 * write (full, no access), so a run is not lost at «Stop» (TASK-252).
 */
export function endRecording(): SavedRun | null {
  const recording = active !== null;
  active?.stop();
  const notWritten = recording ? activeNotWritten() : null;
  active = null;
  activeNotWritten = () => null;
  return notWritten ?? loadRun();
}

/**
 * Ends the run in progress, writing what there is, and gives it back when
 * it can be scored (TASK-113): for the finish screen, before navigation
 * itself has stopped.
 */
export function endRun(): ScorableRun | null {
  return scorable(endRecording());
}
