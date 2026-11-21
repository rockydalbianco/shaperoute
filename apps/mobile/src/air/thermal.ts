import type { Track, TrackFix } from "../navigation/trackRecorder";
import { bearingOf, lengthOf, type Metres, planeAt, turnBetween } from "./airGeometry";

/**
 * Circling and thermals (TASK-479 part B1, ADR-0388), from the fixes the
 * phone records. A pilot circling turns all the time: over the last
 * TURN_WINDOW_MS the track turns at least MIN_TURN_RATE degrees a second.
 * A run of such fixes that turns at least MIN_CIRCLE_TURN in all is a
 * circling; with height gained it is a thermal. Numbers, never advice.
 */

/** The turn rate is read over this long. */
export const TURN_WINDOW_MS = 10_000;
/** Less than this inside the window says nothing of the turn. */
export const MIN_TURN_SPAN_MS = 5_000;
/** Degrees a second a circling pilot turns at least (a 360 in a minute). */
export const MIN_TURN_RATE = 6;
/** A circling turns at least this much, in all. */
export const MIN_CIRCLE_TURN = 270;
/** A straight bit shorter than this does not end a circling. */
export const MAX_STRAIGHT_IN_CIRCLE_MS = 8_000;
/** A step shorter than this has no heading worth reading. */
export const MIN_STEP_M = 1;
/** After the last fix, a circling is still the one of now for this long. */
export const CIRCLE_STALE_MS = 10_000;

export type Circling = {
  /** Indices in the track's fixes, both included. */
  from: number;
  to: number;
  startMs: number;
  endMs: number;
  /** The whole turn, + clockwise (right), − counter-clockwise (left). */
  turnDeg: number;
  /** Height at the ends, metres; null without heights. */
  startAltM: number | null;
  endAltM: number | null;
  /** Metres gained from start to end, − when lost. */
  gainM: number | null;
  /** Average climb, m/s. */
  avgMps: number | null;
};

type Step = { atMs: number; heading: number | null; gap: boolean };

function heightOf(fix: TrackFix): number | null {
  const height = fix.altitudeM;
  return height === undefined || height === null || !Number.isFinite(height) ? null : height;
}

/** The heading of the step into each fix (null on the first, after a gap,
 * or on a step too short). */
function stepsOf(fixes: readonly TrackFix[], at: (fix: TrackFix) => Metres): Step[] {
  const steps: Step[] = [];
  for (let i = 0; i < fixes.length; i += 1) {
    const fix = fixes[i];
    if (i === 0 || fix.gap === true) {
      steps.push({ atMs: fix.timeMs, heading: null, gap: true });
      continue;
    }
    const a = at(fixes[i - 1]);
    const b = at(fix);
    steps.push({
      atMs: fix.timeMs,
      heading: lengthOf(a, b) >= MIN_STEP_M ? bearingOf(a, b) : null,
      gap: false,
    });
  }
  return steps;
}

/** Whether each fix is turning: the turn over the window before it, per
 * second, is at least MIN_TURN_RATE. Also the signed turn into each fix. */
function turningOf(steps: readonly Step[]): { turning: boolean[]; turnInto: number[] } {
  const turnInto: number[] = steps.map(() => 0);
  let lastHeading: number | null = null;
  for (let i = 0; i < steps.length; i += 1) {
    if (steps[i].gap) {
      // No turn across a pause: the pilot was elsewhere.
      lastHeading = null;
    }
    const heading = steps[i].heading;
    if (heading === null) {
      continue;
    }
    if (lastHeading !== null) {
      turnInto[i] = turnBetween(lastHeading, heading);
    }
    lastHeading = heading;
  }
  const turning: boolean[] = steps.map(() => false);
  let start = 0;
  let sum = 0;
  for (let i = 0; i < steps.length; i += 1) {
    sum += turnInto[i];
    while (steps[i].atMs - steps[start].atMs > TURN_WINDOW_MS) {
      start += 1;
      sum -= turnInto[start];
    }
    // `sum` holds the turns into start+1 … i: the window's.
    const span = steps[i].atMs - steps[start].atMs;
    turning[i] = span >= MIN_TURN_SPAN_MS && Math.abs(sum) / (span / 1000) >= MIN_TURN_RATE;
  }
  return { turning, turnInto };
}

/** Every circling of the track, in order. */
export function circlings(track: Track): Circling[] {
  const fixes = track.fixes;
  if (fixes.length < 3) {
    return [];
  }
  const at = (() => {
    const plane = planeAt(fixes[0].point);
    return (fix: TrackFix) => plane(fix.point);
  })();
  const steps = stepsOf(fixes, at);
  const { turning, turnInto } = turningOf(steps);
  const runs: { from: number; to: number }[] = [];
  for (let i = 0; i < fixes.length; i += 1) {
    if (!turning[i]) {
      continue;
    }
    const last = runs[runs.length - 1];
    if (
      last !== undefined &&
      fixes[i].timeMs - fixes[last.to].timeMs <= MAX_STRAIGHT_IN_CIRCLE_MS &&
      !fixes.slice(last.to + 1, i + 1).some((fix) => fix.gap === true)
    ) {
      last.to = i;
    } else {
      runs.push({ from: i, to: i });
    }
  }
  const out: Circling[] = [];
  for (const run of runs) {
    // The turn rate looks back a window: the circling began about then.
    let from = run.from;
    while (
      from > 0 &&
      fixes[from].gap !== true &&
      fixes[run.from].timeMs - fixes[from - 1].timeMs <= TURN_WINDOW_MS / 2
    ) {
      from -= 1;
    }
    let turn = 0;
    for (let i = from + 1; i <= run.to; i += 1) {
      turn += turnInto[i];
    }
    if (Math.abs(turn) < MIN_CIRCLE_TURN) {
      continue;
    }
    const startAltM = heightOf(fixes[from]);
    const endAltM = heightOf(fixes[run.to]);
    const ms = fixes[run.to].timeMs - fixes[from].timeMs;
    const gainM = startAltM === null || endAltM === null ? null : endAltM - startAltM;
    out.push({
      from,
      to: run.to,
      startMs: fixes[from].timeMs,
      endMs: fixes[run.to].timeMs,
      turnDeg: turn,
      startAltM,
      endAltM,
      gainM,
      avgMps: gainM === null || ms <= 0 ? null : gainM / (ms / 1000),
    });
  }
  return out;
}

export type ThermalNow = {
  /** The pilot is circling now. */
  active: boolean;
  /** The circling's average climb, m/s: now's, or the last thermal's. */
  avgMps: number | null;
  /** Metres gained in it. */
  gainM: number | null;
  startMs: number;
};

/** The circling of now; or, when not circling, the last one that gained
 * height; null before any. */
export function thermalNow(track: Track, nowMs: number, all: readonly Circling[] = circlings(track)): ThermalNow | null {
  const lastFix = track.fixes[track.fixes.length - 1];
  const last = all[all.length - 1];
  if (
    last !== undefined &&
    lastFix !== undefined &&
    last.to === track.fixes.length - 1 &&
    nowMs - lastFix.timeMs <= CIRCLE_STALE_MS
  ) {
    return { active: true, avgMps: last.avgMps, gainM: last.gainM, startMs: last.startMs };
  }
  for (let i = all.length - 1; i >= 0; i -= 1) {
    const one = all[i];
    if (one.gainM !== null && one.gainM > 0) {
      return { active: false, avgMps: one.avgMps, gainM: one.gainM, startMs: one.startMs };
    }
  }
  return null;
}

/** Whether the pilot is circling at the track's last fix. */
export function circlingNow(track: Track, all: readonly Circling[] = circlings(track)): boolean {
  const last = all[all.length - 1];
  return last !== undefined && last.to === track.fixes.length - 1;
}

export type AssistantPoint = Metres & { varioMps: number | null };

export type Assistant = {
  /** The last minute of the track, in metres from where the pilot is now
   * (east, north), with the climb at each point. */
  points: AssistantPoint[];
  /** The point that climbed best, when one climbed. */
  best: AssistantPoint | null;
};

/** The climb at each point is read over this long, ending there. */
export const ASSISTANT_VARIO_MS = 3_000;
/** The thermal assistant shows the track of this long. */
export const ASSISTANT_SPAN_MS = 60_000;

/** The thermal assistant's picture at the track's last fix. */
export function assistantOf(track: Track, spanMs: number = ASSISTANT_SPAN_MS): Assistant {
  const fixes = track.fixes;
  const last = fixes[fixes.length - 1];
  if (last === undefined) {
    return { points: [], best: null };
  }
  const plane = planeAt(last.point);
  let first = fixes.length - 1;
  while (first > 0 && fixes[first].gap !== true && last.timeMs - fixes[first - 1].timeMs <= spanMs) {
    first -= 1;
  }
  const points: AssistantPoint[] = [];
  let back = first;
  for (let i = first; i < fixes.length; i += 1) {
    const fix = fixes[i];
    while (back < i && fix.timeMs - fixes[back + 1].timeMs >= ASSISTANT_VARIO_MS) {
      back += 1;
    }
    const top = heightOf(fix);
    const from = heightOf(fixes[back]);
    const ms = fix.timeMs - fixes[back].timeMs;
    const varioMps =
      top === null || from === null || ms < ASSISTANT_VARIO_MS / 2 ? null : (top - from) / (ms / 1000);
    points.push({ ...plane(fix.point), varioMps });
  }
  let best: AssistantPoint | null = null;
  for (const point of points) {
    if (point.varioMps !== null && point.varioMps > 0 && (best === null || point.varioMps > (best.varioMps ?? 0))) {
      best = point;
    }
  }
  return { points, best };
}
