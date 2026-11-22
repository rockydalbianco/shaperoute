import type { Activity, LatLon } from "@shaperoute/shared-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { type MatchAnswer, matchStroke } from "../engine/matchOnPhone";
import {
  answered,
  type Ask,
  askOf,
  fromAfter,
  keeps,
  snapping,
  type Stroke,
  strokesOfLines,
} from "./matching";

/** After the finger lifts, the strokes wait this long before they are sent:
 * a second line drawn at once is sent with the first. */
export const MATCH_DEBOUNCE_MS = 300;
/** The answers kept: «Undo» then «Redo» finds its strokes anchored at once. */
export const KEPT_ANSWERS = 200;

export type MapMatchingOptions = {
  apiUrl: string | null;
  activity: Activity;
  /** The magnet, 0 to 1; the engine's default when absent. */
  fit?: number;
  /** The lines drawn with a finger, in order. The same array while they do
   * not change: a new one sends what changed. */
  lines: readonly (readonly LatLon[])[];
  /** Off, nothing is sent and there are no strokes. */
  enabled: boolean;
  /** The engine on the phone, then the server (a stand-in in the tests). */
  match?: typeof matchStroke;
  debounceMs?: number;
};

export type MapMatchingState = {
  /** The strokes of the lines, in order, each as anchored so far. */
  strokes: Stroke[];
  /** A stroke is being anchored: «Snapping to roads…». */
  snapping: boolean;
  /** Asks again for the strokes left without an answer that may get one
   * now (back online, a zone downloaded). */
  retry: () => void;
};

type Answers = ReadonlyMap<string, MatchAnswer>;

/** `answers` with `key` the newest, the oldest dropped beyond `size`. */
function withAnswer(
  answers: Answers,
  key: string,
  answer: MatchAnswer,
  size: number,
): Answers {
  const next = new Map(answers);
  next.delete(key);
  next.set(key, answer);
  for (const oldest of next.keys()) {
    if (next.size <= size) {
      break;
    }
    next.delete(oldest);
  }
  return next;
}

/** The strokes as the answers known make them, and the request of the first
 * one still to send; all after it wait for its end on the roads. */
function strokesFrom(
  base: readonly Stroke[],
  activity: Activity,
  fit: number | undefined,
  kept: Answers,
  missed: Answers,
): { strokes: Stroke[]; next: Ask | null } {
  const done: Stroke[] = [];
  for (const stroke of base) {
    const from = fromAfter(done[done.length - 1]);
    const ask = askOf(activity, fit, stroke.points, from);
    const answer = kept.get(ask.key) ?? missed.get(ask.key);
    const now = answer === undefined ? null : answered({ ...stroke, from }, answer);
    if (now === null) {
      return { strokes: [...done, ...base.slice(done.length)], next: ask };
    }
    done.push(now);
  }
  return { strokes: done, next: null };
}

/**
 * The lines drawn on the map anchored to the roads, stroke by stroke, as
 * the finger lifts (TASK-347 part C, ADR-0300). Strokes are sent one after
 * the other, each from the end of the one before on the roads; answers are
 * kept, so «Undo» and «Redo» draw at once what was anchored before. A
 * change of the lines, the magnet or the activity cancels what was being
 * sent and goes on from the first stroke whose answer is not known.
 */
export function useMapMatching({
  apiUrl,
  activity,
  fit,
  lines,
  enabled,
  match = matchStroke,
  debounceMs = MATCH_DEBOUNCE_MS,
}: MapMatchingOptions): MapMatchingState {
  const base = useMemo(() => (enabled ? strokesOfLines(lines) : []), [enabled, lines]);
  // Matches and verdicts come back the same: kept. "None" may not: kept
  // until «retry».
  const [kept, setKept] = useState<Answers>(() => new Map());
  const [missed, setMissed] = useState<Answers>(() => new Map());
  const { strokes, next } = useMemo(
    () => strokesFrom(base, activity, fit, kept, missed),
    [activity, base, fit, kept, missed],
  );
  // The lines the last request was sent for: new lines wait for the timer,
  // the strokes after an answer go at once.
  const sentFor = useRef<readonly Stroke[] | null>(null);

  useEffect(() => {
    if (next === null) {
      return;
    }
    const stop = new AbortController();
    const fresh = sentFor.current !== base;
    const timer = setTimeout(
      () => {
        sentFor.current = base;
        void match(apiUrl, next.request, { signal: stop.signal }).then((answer) => {
          if (stop.signal.aborted || answer.kind === "cancelled") {
            return;
          }
          if (keeps(answer)) {
            setKept((now) => withAnswer(now, next.key, answer, KEPT_ANSWERS));
          } else {
            setMissed((now) => withAnswer(now, next.key, answer, KEPT_ANSWERS));
          }
        });
      },
      fresh ? debounceMs : 0,
    );
    return () => {
      clearTimeout(timer);
      stop.abort();
    };
  }, [apiUrl, base, debounceMs, match, next]);

  const retry = useCallback(() => setMissed(new Map()), []);
  return { strokes, snapping: snapping(strokes), retry };
}
