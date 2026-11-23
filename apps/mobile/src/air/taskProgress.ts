import type { LatLon } from "@shaperoute/shared-types";

import type { TrackFix } from "../navigation/trackRecorder";
import { planeAt } from "./airGeometry";
import type { FlightTask } from "./flightTask";
import { distanceM, type Route, shortestRoute } from "./taskRoute";

/**
 * How far the pilot is along the task (TASK-479 part D2, ADR-0388), from
 * the track in the air: the start is taken crossing its cylinder's edge,
 * in or out, once its first gate is open (XCTrack's format calls the
 * file's direction obsolete: readers ignore it); a
 * turnpoint, the end of speed section and a goal cylinder when the track
 * comes inside, between two fixes too; a goal line when the track crosses
 * it forwards. Turnpoints are taken in order, never skipped. A start
 * crossed again before the next turnpoint is a new start.
 */

export type Taken = { index: number; atMs: number };

export type TaskProgress = {
  /** The index in `task.turnpoints` of the next one to take; their
   * number once the goal is taken. */
  next: number;
  taken: Taken[];
  /** When the pilot last started, null before. */
  startMs: number | null;
};

/** Where a task begins: past its takeoff, which is not taken. */
export function firstToTake(task: FlightTask): number {
  return task.turnpoints[0]?.kind === "takeoff" ? 1 : 0;
}

export function startOf(task: FlightTask): TaskProgress {
  return { next: firstToTake(task), taken: [], startMs: null };
}

/** A gate «HH:MM:SSZ» (UTC) as a time on the UTC day of `dayMs`, or null. */
export function gateMs(gate: string, dayMs: number): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?Z?$/.exec(gate.trim());
  if (match === null) {
    return null;
  }
  const day = new Date(dayMs);
  return Date.UTC(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
    Number(match[1]),
    Number(match[2]),
    Number(match[3] ?? 0),
  );
}

/** The start's gates on the day of `nowMs`, in order. */
export function gatesOn(task: FlightTask, nowMs: number): number[] {
  return (task.start?.gates ?? [])
    .map((gate) => gateMs(gate, nowMs))
    .filter((ms): ms is number => ms !== null)
    .sort((a, b) => a - b);
}

/** Whether the segment `a`–`b` (metres around the centre) comes within
 * `radiusM` of the centre. */
function segmentNear(
  a: { x: number; y: number },
  b: { x: number; y: number },
  radiusM: number,
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length2 = dx * dx + dy * dy;
  const t =
    length2 === 0 ? 0 : Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / length2));
  return Math.hypot(a.x + t * dx, a.y + t * dy) <= radiusM;
}

/** Whether the step from `before` to `fix` takes turnpoint `index`. */
function takes(
  task: FlightTask,
  index: number,
  before: TrackFix | null,
  fix: TrackFix,
): boolean {
  const turnpoint = task.turnpoints[index];
  const centre = turnpoint.waypoint.point;
  const radiusM = turnpoint.radiusM;
  const here = distanceM(fix.point, centre, task.earth);
  const step = before !== null && fix.gap !== true ? before : null;
  if (turnpoint.kind === "start" && task.start !== null) {
    if (step === null) {
      return false;
    }
    const gates = gatesOn(task, fix.timeMs);
    if (gates.length > 0 && fix.timeMs < gates[0]) {
      return false;
    }
    const was = distanceM(step.point, centre, task.earth);
    return was <= radiusM !== here <= radiusM;
  }
  const last = index === task.turnpoints.length - 1;
  if (last && task.goal.type === "line") {
    if (step === null || index === 0) {
      return false;
    }
    // The line stands across the last leg, through the goal's centre.
    const plane = planeAt(centre);
    const from = plane(task.turnpoints[index - 1].waypoint.point);
    const length = Math.hypot(from.x, from.y);
    if (length === 0) {
      return false;
    }
    const u = { x: -from.x / length, y: -from.y / length };
    const a = plane(step.point);
    const b = plane(fix.point);
    const da = a.x * u.x + a.y * u.y;
    const db = b.x * u.x + b.y * u.y;
    if (!(da < 0 && db >= 0)) {
      return false;
    }
    const t = da / (da - db);
    const x = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
    return Math.abs(x.x * u.y - x.y * u.x) <= radiusM;
  }
  if (here <= radiusM) {
    return true;
  }
  if (step === null) {
    return false;
  }
  const plane = planeAt(centre);
  return segmentNear(plane(step.point), plane(fix.point), radiusM);
}

/** The progress after the step from `before` to `fix`. */
export function advance(
  task: FlightTask,
  progress: TaskProgress,
  before: TrackFix | null,
  fix: TrackFix,
): TaskProgress {
  let { next, taken, startMs } = progress;
  // A new start: crossed again before the turnpoint after it.
  const startIndex = task.turnpoints.findIndex((one) => one.kind === "start");
  if (
    startIndex >= 0 &&
    next === startIndex + 1 &&
    taken.length > 0 &&
    takes(task, startIndex, before, fix)
  ) {
    taken = taken.map((one) =>
      one.index === startIndex ? { ...one, atMs: fix.timeMs } : one,
    );
    startMs = fix.timeMs;
    return { next, taken, startMs };
  }
  // One step may take more than one turnpoint, where cylinders overlap;
  // the start only by its own crossing.
  while (next < task.turnpoints.length && takes(task, next, before, fix)) {
    taken = [...taken, { index: next, atMs: fix.timeMs }];
    if (task.turnpoints[next].kind === "start") {
      startMs = fix.timeMs;
      next += 1;
      break;
    }
    next += 1;
  }
  return { next, taken, startMs };
}

/** The progress over `fixes` from `takeoffMs`. */
export function progressOver(
  task: FlightTask,
  fixes: readonly TrackFix[],
  takeoffMs: number | null,
): TaskProgress {
  let progress = startOf(task);
  if (takeoffMs === null) {
    return progress;
  }
  let before: TrackFix | null = null;
  for (const fix of fixes) {
    if (fix.timeMs < takeoffMs) {
      continue;
    }
    progress = advance(task, progress, before, fix);
    before = fix;
  }
  return progress;
}

/** The last answer, carried on fix by fix: the recording and the flight
 * screen ask once a second each. */
let kept: {
  task: FlightTask;
  takeoffMs: number | null;
  firstMs: number | null;
  count: number;
  before: TrackFix | null;
  progress: TaskProgress;
} | null = null;

/** As `progressOver`, going on from the last answer when the track only
 * grew. */
export function progressOf(
  task: FlightTask,
  fixes: readonly TrackFix[],
  takeoffMs: number | null,
): TaskProgress {
  const firstMs = fixes[0]?.timeMs ?? null;
  if (
    kept === null ||
    kept.task !== task ||
    kept.takeoffMs !== takeoffMs ||
    kept.firstMs !== firstMs ||
    fixes.length < kept.count
  ) {
    kept = {
      task,
      takeoffMs,
      firstMs,
      count: 0,
      before: null,
      progress: startOf(task),
    };
  }
  if (takeoffMs !== null) {
    for (let i = kept.count; i < fixes.length; i += 1) {
      const fix = fixes[i];
      if (fix.timeMs < takeoffMs) {
        continue;
      }
      kept.progress = advance(task, kept.progress, kept.before, fix);
      kept.before = fix;
    }
  }
  kept.count = fixes.length;
  return kept.progress;
}

/** For tests: nothing kept. */
export function resetTaskProgress(): void {
  kept = null;
}

/** The shortest way left, from `here` through the turnpoints not taken;
 * null once the goal is taken. */
export function routeLeft(
  task: FlightTask,
  progress: TaskProgress,
  here: LatLon,
): Route | null {
  const left = task.turnpoints.slice(progress.next);
  if (left.length === 0) {
    return null;
  }
  return shortestRoute(here, left, task.earth, task.goal.type === "line");
}

/** How far `here` is from the edge of turnpoint `index`'s cylinder (from
 * the goal line's middle, for a line), metres. */
export function edgeM(task: FlightTask, index: number, here: LatLon): number {
  const turnpoint = task.turnpoints[index];
  const centre = distanceM(here, turnpoint.waypoint.point, task.earth);
  const line = index === task.turnpoints.length - 1 && task.goal.type === "line";
  return line ? centre : Math.abs(centre - turnpoint.radiusM);
}

/** The start's gate at `nowMs`: how long until the first opens, or open;
 * null for a task without a start. */
export function startGateAt(
  task: FlightTask,
  nowMs: number,
): { opensInMs: number } | "open" | null {
  if (task.start === null) {
    return null;
  }
  const first = gatesOn(task, nowMs)[0];
  return first !== undefined && nowMs < first ? { opensInMs: first - nowMs } : "open";
}

/** The task as the flight screen shows it at a tick. */
export type TaskNow = {
  task: FlightTask;
  progress: TaskProgress;
  /** The pilot's last fix, null before the first. */
  here: LatLon | null;
  /** The shortest way left from `here`. */
  left: Route | null;
};

export function taskNowOf(
  task: FlightTask,
  fixes: readonly TrackFix[],
  takeoffMs: number | null,
): TaskNow {
  const progress = progressOf(task, fixes, takeoffMs);
  const here = fixes[fixes.length - 1]?.point ?? null;
  return {
    task,
    progress,
    here,
    left: here === null ? null : routeLeft(task, progress, here),
  };
}
