import {
  type Activity,
  LETTER_DISTANCE_M,
  LETTERS,
  MAX_WORD_LETTERS,
  type RouteRequest,
} from "@shaperoute/shared-types";

import { t } from "../i18n";
import { milesAtLeast } from "../units/distanceInput";
import { appUnits, type Units } from "../units/units";
import { distanceLimits, distanceLimitsM, MAX_APP_DISTANCE_KM } from "./distance";
import { shapeName } from "./shapeWords";

/** What the route draws: a shape of the catalogue, or a word (ADR-0053). */
export type DrawKind = "shape" | "word";

/**
 * The most letters the app accepts: the contract allows MAX_WORD_LETTERS, but
 * each needs LETTER_DISTANCE_M and the app stops at MAX_APP_DISTANCE_KM (7).
 */
export const MAX_APP_WORD_LETTERS = Math.min(
  MAX_WORD_LETTERS,
  Math.floor((MAX_APP_DISTANCE_KM * 1000) / LETTER_DISTANCE_M),
);

/**
 * The most letters for `activity` (TASK-190): MAX_APP_WORD_LETTERS for a
 * run; by bike, up to 30 km, all MAX_WORD_LETTERS of the contract. With
 * «Miles» (TASK-182) a run stops at 13 mi, under the 21 km of seven
 * letters: six.
 */
export function maxWordLetters(activity: Activity, units: Units = appUnits()): number {
  return Math.min(
    MAX_WORD_LETTERS,
    Math.floor(distanceLimitsM(activity, units)[1] / LETTER_DISTANCE_M),
  );
}

/** Room to type past the limit, so the field can say why it is too long. */
export const MAX_WORD_FIELD_LENGTH = 20;

export type WordCheck =
  | { ok: true; word: string }
  | {
      ok: false;
      problem: string;
      /** The word is fine but the distance is short: the least it needs. */
      needsDistanceM?: number;
    };

const KNOWN = new Set<string>(LETTERS);

/** The least distance a word needs: LETTER_DISTANCE_M for each letter. */
export function wordDistanceM(word: string): number {
  return Array.from(word).length * LETTER_DISTANCE_M;
}

/**
 * The word field as the API will take it (API.md, «Una parola invece di una
 * forma»): the word in capitals, or why it cannot be sent, in plain English.
 * A distance that is not valid (null) is left to the distance field.
 * `activity`: whose distances «Draw» offers (TASK-190); a run's unless said.
 * `units`: the app's; with «Miles» the distances are said in miles, never
 * less than they are (TASK-182).
 */
export function checkWord(
  text: string,
  distanceM: number | null,
  activity: Activity = "running",
  units: Units = appUnits(),
): WordCheck {
  const typed = text.trim();
  if (typed === "") {
    return { ok: false, problem: t("Write a word to draw, with the letters A to Z.") };
  }
  if (/\s/.test(typed)) {
    return { ok: false, problem: t("One word only, without spaces.") };
  }
  // Code points, not UTF-16 units: an emoji is one character, not two.
  const characters = Array.from(typed);
  const unknown = characters.find((character) => !KNOWN.has(character.toUpperCase()));
  if (unknown !== undefined) {
    const upper = unknown.toUpperCase();
    const shown = Array.from(upper).length === 1 ? upper : unknown;
    return {
      ok: false,
      problem: t(
        "No letter “{letter}”: a word can use only the letters A to Z, without accents.",
        { letter: shown },
      ),
    };
  }
  const word = typed.toUpperCase();
  const most = maxWordLetters(activity, units);
  if (characters.length > most) {
    const highest = distanceLimits(activity, units)[1];
    return {
      ok: false,
      // The distance is the limit for a run; by bike, the contract's letters.
      problem:
        most >= MAX_WORD_LETTERS
          ? t("At most {most} letters.", { most })
          : units === "mi"
            ? t(
                "At most {most} letters: each needs {each} mi, and the app goes up to {highest} mi.",
                { most, each: milesAtLeast(LETTER_DISTANCE_M), highest },
              )
            : t(
                "At most {most} letters: each needs {each} km, and the app goes up to {highest} km.",
                { most, each: LETTER_DISTANCE_M / 1000, highest },
              ),
    };
  }
  const needs = wordDistanceM(word);
  if (distanceM !== null && distanceM < needs) {
    return {
      ok: false,
      problem:
        units === "mi"
          ? t("“{word}” needs at least {mi} mi: {each} mi for each letter.", {
              word,
              mi: milesAtLeast(needs),
              each: milesAtLeast(LETTER_DISTANCE_M),
            })
          : t("“{word}” needs at least {km} km: {each} km for each letter.", {
              word,
              km: needs / 1000,
              each: LETTER_DISTANCE_M / 1000,
            }),
      needsDistanceM: needs,
    };
  }
  return { ok: true, word };
}

/** The route's name on screen: the word, or the shape as read (TASK-057). */
export function routeName(request: RouteRequest): string {
  if (request.word) {
    return `“${request.word}”`;
  }
  return request.shape ? shapeName(request.shape) : String(request.shape);
}
