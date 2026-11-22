import type { Track } from "../navigation/trackRecorder";
import {
  climbOver,
  lastStretch,
  MIN_VARIO_NOW_SPAN_MS,
  VARIO_NOW_MS,
} from "./instrument";

/**
 * The vario's sound (TASK-479 part C, ADR-0388): which tone the climb of
 * the moment asks for. The tones are files made by `tools/vario_tones.py`,
 * one per step: a level here is a file there.
 *
 * - Climbing from the pilot's threshold up (+0.2 m/s by default): beeps,
 *   from 600 Hz and 2 a second at 0 m/s to 1600 Hz and 8 a second at
 *   +5 m/s and more, a step every 0.5 m/s.
 * - Sinking past the pilot's threshold (−2.5 m/s by default): a steady low
 *   note, lower as the sink grows, a step every 1 m/s from 2 m/s.
 * - In between: silence.
 *
 * A margin keeps the tone from flicking between two steps, or on and off,
 * when the climb sits on a boundary. The climb is the flight screen's
 * vario: GPS heights, once a second, so the sound comes 1–2 s after the
 * real climb.
 */

export const CLIMB_STEP_MPS = 0.5;
export const CLIMB_LEVELS = 11;
export const SINK_FIRST_MPS = 2;
export const SINK_STEP_MPS = 1;
export const SINK_LEVELS = 4;

/** How far past a boundary the climb must go before the tone changes. */
export const MARGIN_MPS = 0.1;

/** Without a fix for this long, the vario goes quiet: a sound with no
 * number behind it would lie. */
export const SOUND_STALE_MS = 5_000;

export type VarioTone =
  { kind: "climb"; level: number } | { kind: "sink"; level: number } | null;

export type ToneThresholds = {
  /** Beeps from this climb, m/s (positive). */
  climbFromMps: number;
  /** The low note from this climb, m/s (negative); null: never. */
  sinkBelowMps: number | null;
};

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/** The climb step of `mps`, 0 to CLIMB_LEVELS − 1. */
export function climbLevel(mps: number): number {
  return clamp(Math.floor(mps / CLIMB_STEP_MPS), 0, CLIMB_LEVELS - 1);
}

/** The sink step of `mps` (negative), 0 to SINK_LEVELS − 1. */
export function sinkLevel(mps: number): number {
  return clamp(Math.floor((-mps - SINK_FIRST_MPS) / SINK_STEP_MPS), 0, SINK_LEVELS - 1);
}

/** `previous` while `mps` is within the margin of it, or the new level. */
function steady(
  previous: number | null,
  mps: number,
  levelOf: (mps: number) => number,
): number {
  const now = levelOf(mps);
  if (previous === null || previous === now) {
    return now;
  }
  const up = levelOf(mps - MARGIN_MPS);
  const down = levelOf(mps + MARGIN_MPS);
  return up === previous || down === previous ? previous : now;
}

/** The tone for a climb of `mps` (null: no number), after `previous`. */
export function toneFor(
  mps: number | null,
  thresholds: ToneThresholds,
  previous: VarioTone = null,
): VarioTone {
  if (mps === null || !Number.isFinite(mps)) {
    return null;
  }
  const { climbFromMps, sinkBelowMps } = thresholds;
  const climbing = previous?.kind === "climb";
  if (mps >= climbFromMps || (climbing && mps >= climbFromMps - MARGIN_MPS)) {
    const level = steady(climbing ? previous.level : null, mps, climbLevel);
    return { kind: "climb", level };
  }
  if (sinkBelowMps === null) {
    return null;
  }
  const sinking = previous?.kind === "sink";
  if (mps <= sinkBelowMps || (sinking && mps <= sinkBelowMps + MARGIN_MPS)) {
    const level = steady(sinking ? previous.level : null, mps, sinkLevel);
    return { kind: "sink", level };
  }
  return null;
}

export function sameTone(a: VarioTone, b: VarioTone): boolean {
  return (
    a === b || (a !== null && b !== null && a.kind === b.kind && a.level === b.level)
  );
}

/** The climb the sound follows at `nowMs`: the flight screen's vario, null
 * once the fixes stop. */
export function soundClimbOf(track: Track, nowMs: number): number | null {
  const fixes = track.fixes;
  const last = fixes[fixes.length - 1];
  if (last === undefined || nowMs - last.timeMs > SOUND_STALE_MS) {
    return null;
  }
  return climbOver(lastStretch(fixes), VARIO_NOW_MS, MIN_VARIO_NOW_SPAN_MS);
}
