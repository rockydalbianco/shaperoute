import type { Walk } from "@shaperoute/shared-types";

import { type Cue, POOR_FIX_M } from "./navigator";
import { penDownCue, penUpCue } from "./phrases";

/**
 * The pen of a word with the pen up, along the run (TASK-198): pure
 * functions from where the navigator places the runner on the route to
 * when the recording pauses and goes on, and what the voice says then.
 *
 * The pen goes up when the runner reaches the first point of a walk, the
 * end of a letter, and comes down PEN_DOWN_M before its last point, the
 * start of the next letter. Both are read from the navigator's metres along
 * the route (ADR-0052), never from a fix alone: the shortest way to a letter
 * can pass near it across a river and reach it only after a bridge.
 */

/**
 * The next letter starts the recording this far before it, along the route:
 * half of POOR_FIX_M. A fix the run keeps is at most POOR_FIX_M off, one in
 * a town 10–20 m (OFF_ROUTE_M): from this far, a fix that lags still starts
 * the recording on the letter, and the few metres of walk it may take in
 * are on a walk, which the score leaves out (`walks`).
 */
export const PEN_DOWN_M = POOR_FIX_M / 2;

/** A walk in metres along the route, and the letter it leads to. */
type Stretch = { fromM: number; toM: number; letter: string | null };

export type Pen = {
  walks: readonly Stretch[];
  /** The walk ahead or being walked; walks.length after the last. */
  next: number;
  /** The pen is up: the runner is on walks[next]. */
  up: boolean;
};

/** What the pen did at a fix: up at the end of a letter, down at the start
 * of the next, or nothing; with the words to say. */
export type PenStep = { pen: Pen; move: "up" | "down" | null; cues: Cue[] };

/**
 * The pen at the start of a route whose metres from its start are `along`,
 * with the walks it has (already checked: walksOf). `word` names the letters:
 * the walk at `i` leads to its letter `i + 1`, when it has one more letter
 * than walks; otherwise the voice says "the next letter".
 */
export function startPen(
  along: readonly number[],
  walks: readonly Walk[],
  word: string | null | undefined,
): Pen {
  const letters = word ? Array.from(word.toUpperCase()) : [];
  const named = letters.length === walks.length + 1;
  return {
    walks: walks.map(([from, to], i) => ({
      fromM: along[from] ?? 0,
      toM: along[to] ?? 0,
      letter: named ? letters[i + 1] : null,
    })),
    next: 0,
    up: false,
  };
}

/**
 * The pen after a fix that the navigator placed `alongM` along the route.
 * A fix less accurate than POOR_FIX_M moves nothing: it may place the
 * runner where they are not. One move at most per fix, so each walk is one
 * pause and each cue is said once.
 */
export function movePen(
  pen: Pen,
  alongM: number,
  accuracyM: number | null = null,
): PenStep {
  const walk = pen.walks[pen.next];
  const still: PenStep = { pen, move: null, cues: [] };
  if (walk === undefined || (accuracyM !== null && accuracyM > POOR_FIX_M)) {
    return still;
  }
  if (!pen.up) {
    return alongM < walk.fromM
      ? still
      : {
          pen: { ...pen, up: true },
          move: "up",
          cues: [{ say: penUpCue(walk.letter), vibrate: true }],
        };
  }
  return alongM < walk.toM - PEN_DOWN_M
    ? still
    : {
        pen: { ...pen, next: pen.next + 1, up: false },
        move: "down",
        cues: [{ say: penDownCue(walk.letter), vibrate: true }],
      };
}
