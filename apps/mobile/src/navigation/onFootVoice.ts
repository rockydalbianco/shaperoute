import type { Stretch } from "@shaperoute/shared-types";

import { ANNOUNCE_M, ARRIVE_M, type Cue, POOR_FIX_M } from "./navigator";

/**
 * The bike on foot along a ride (TASK-206, ADR-0167): pure functions from
 * where the navigator places the rider on the route to what the voice says
 * before a stretch with the bike on foot and at its end. The recording goes
 * on: a stretch on foot is part of the drawing, unlike the walks of a word
 * with the pen up (penUp.ts).
 *
 * Read from the navigator's metres along the route (ADR-0052), never from a
 * fix alone, as the pen is.
 */

/** The stretch is said this far before it: as far as a turn is. */
export const ON_FOOT_AHEAD_M = ANNOUNCE_M;

/**
 * Two stretches closer than this are said as one: getting back on the bike
 * for a few metres is not worth two sentences, and the second would come
 * before the first had ended.
 */
export const ON_FOOT_JOIN_M = 30;

/**
 * A stretch shorter than this, once joined, is not said: a few metres the
 * wrong way down a one-way street are crossed on foot without being told.
 * The map still marks it.
 */
export const ON_FOOT_SAID_M = 25;

/** What the voice says, in the language it speaks (`src/voice/`). */
export type BikeWords = {
  /** "In 50 metres, get off and walk the bike for 200 metres"; with `inM`
   * null, from here. Both are rounded where they are said. */
  walkTheBike(inM: number | null, metres: number): string;
  /** "Back on the bike." */
  backOnTheBike: string;
};

/** A stretch in metres along the route. */
type Span = { fromM: number; toM: number };

export type OnFoot = {
  spans: readonly Span[];
  /** The stretch ahead or being walked; spans.length after the last. */
  next: number;
  /** Its start has been said. */
  said: boolean;
  /** The route's end: a stretch that ends there has no "back on the bike". */
  endM: number;
};

/** What the bike on foot said at a fix. */
export type OnFootStep = { onFoot: OnFoot; cues: Cue[] };

/**
 * The stretches of a route whose metres from its start are `along`, with
 * the stretches it has (already checked: onFootOf): close ones joined,
 * short ones left out.
 */
export function startOnFoot(
  along: readonly number[],
  stretches: readonly Stretch[],
): OnFoot {
  const joined: Span[] = [];
  for (const [from, to] of stretches) {
    const span = { fromM: along[from] ?? 0, toM: along[to] ?? 0 };
    const last = joined.at(-1);
    if (last !== undefined && span.fromM - last.toM < ON_FOOT_JOIN_M) {
      last.toM = span.toM;
    } else {
      joined.push(span);
    }
  }
  return {
    spans: joined.filter((span) => span.toM - span.fromM >= ON_FOOT_SAID_M),
    next: 0,
    said: false,
    endM: along.at(-1) ?? 0,
  };
}

/**
 * The bike on foot after a fix the navigator placed `alongM` along the
 * route. A fix less accurate than POOR_FIX_M moves nothing. One sentence at
 * most per fix, so each is said once. A stretch passed whole without its
 * start said (a jump of the fix) is passed in silence.
 */
export function moveOnFoot(
  onFoot: OnFoot,
  alongM: number,
  words: BikeWords,
  accuracyM: number | null = null,
): OnFootStep {
  const span = onFoot.spans[onFoot.next];
  const still: OnFootStep = { onFoot, cues: [] };
  if (span === undefined || (accuracyM !== null && accuracyM > POOR_FIX_M)) {
    return still;
  }
  if (alongM >= span.toM) {
    const passed = { ...onFoot, next: onFoot.next + 1, said: false };
    // At the route's end "You have arrived" is enough.
    const atEnd = span.toM >= onFoot.endM - ARRIVE_M;
    return {
      onFoot: passed,
      cues: onFoot.said && !atEnd ? [{ say: words.backOnTheBike, vibrate: true }] : [],
    };
  }
  if (onFoot.said || alongM < span.fromM - ON_FOOT_AHEAD_M) {
    return still;
  }
  const inM = alongM < span.fromM ? span.fromM - alongM : null;
  return {
    onFoot: { ...onFoot, said: true },
    cues: [
      {
        say: words.walkTheBike(inM, span.toM - Math.max(alongM, span.fromM)),
        vibrate: true,
      },
    ],
  };
}
