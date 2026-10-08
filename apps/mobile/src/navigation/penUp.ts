import type { Activity, Walk } from "@shaperoute/shared-types";

import { BASE_LANGUAGE, type Language } from "../i18n/languages";
import { wordsOf } from "../voice/words";
import { type Cue, POOR_FIX_M } from "./navigator";
import { isRide } from "./ride";

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

/**
 * On the water the next part starts the recording this far before it
 * (TASK-226): the stretches with the pen up are tens of metres there, not
 * the hundreds between two letters, and what is recorded before the part is
 * the connecting line the pen up is for leaving out. Under an open sky a fix
 * is good to a few metres: about one fix of a canoe's.
 */
export const PEN_DOWN_ON_WATER_M = 5;

/** A walk in metres along the route, and the letter it leads to. */
type Stretch = { fromM: number; toM: number; letter: string | null };

export type Pen = {
  walks: readonly Stretch[];
  /** The walk ahead or being walked; walks.length after the last. */
  next: number;
  /** The pen is up: the runner is on walks[next]. */
  up: boolean;
  /** Between the letters by bike (TASK-216): "Ride to the U". */
  ride: boolean;
  /** The pieces of a shape, not letters (TASK-223): "the next part". */
  parts: boolean;
  /** Between the pieces on the water (TASK-226): "Paddle to the next part". */
  paddle: boolean;
  /** How far before the end of a walk the pen comes down. */
  downM: number;
};

/** What the pen did at a fix: up at the end of a letter, down at the start
 * of the next, or nothing; with the words to say. */
export type PenStep = { pen: Pen; move: "up" | "down" | null; cues: Cue[] };

/**
 * The pen at the start of a route whose metres from its start are `along`,
 * with the walks it has (already checked: walksOf). `word` names the letters:
 * the walk at `i` leads to its letter `i + 1`, when it has one more letter
 * than walks; otherwise the voice says "the next letter". A route with walks
 * and no word is a shape in pieces (TASK-223): the voice says "the next
 * part". On a route of `activity` "cycling" the way between the letters is
 * ridden (TASK-216), and of "paddling" the way between the parts is paddled,
 * the pen down nearer the next (TASK-226).
 */
export function startPen(
  along: readonly number[],
  walks: readonly Walk[],
  word: string | null | undefined,
  activity?: Activity,
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
    ride: isRide(activity),
    parts: !word,
    paddle: activity === "paddling",
    downM: activity === "paddling" ? PEN_DOWN_ON_WATER_M : PEN_DOWN_M,
  };
}

/**
 * The pen after a fix that the navigator placed `alongM` along the route.
 * A fix less accurate than POOR_FIX_M moves nothing: it may place the
 * runner where they are not. One move at most per fix, so each walk is one
 * pause and each cue is said once, in the voice's `language` (TASK-209).
 */
export function movePen(
  pen: Pen,
  alongM: number,
  accuracyM: number | null = null,
  language: Language = BASE_LANGUAGE,
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
          cues: [{ say: endOfLetter(pen, walk.letter, language), vibrate: true }],
        };
  }
  return alongM < walk.toM - pen.downM
    ? still
    : {
        pen: { ...pen, next: pen.next + 1, up: false },
        move: "down",
        cues: [{ say: startOfLetter(pen, walk.letter, language), vibrate: true }],
      };
}

/** What the voice says at the end of a letter: walk, or ride, to the next;
 * or to the next part of a shape, paddling on the water. */
function endOfLetter(pen: Pen, letter: string | null, language: Language): string {
  const words = wordsOf(language);
  if (pen.parts) {
    return pen.paddle ? words.paddleToPart : pen.ride ? words.rideToPart : words.partUp;
  }
  return pen.ride ? words.rideTo(letter) : words.penUp(letter);
}

/** What the voice says at the start of the next letter, or part. */
function startOfLetter(pen: Pen, letter: string | null, language: Language): string {
  const words = wordsOf(language);
  return pen.parts ? words.partDown : words.penDown(letter);
}
