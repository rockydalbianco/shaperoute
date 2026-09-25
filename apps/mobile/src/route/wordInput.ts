import {
  LETTER_DISTANCE_M,
  LETTERS,
  MAX_WORD_LETTERS,
  type RouteRequest,
} from "@shaperoute/shared-types";

import { MAX_APP_DISTANCE_KM } from "./distance";

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
 */
export function checkWord(text: string, distanceM: number | null): WordCheck {
  const typed = text.trim();
  if (typed === "") {
    return { ok: false, problem: "Write a word to draw, with the letters A to Z." };
  }
  if (/\s/.test(typed)) {
    return { ok: false, problem: "One word only, without spaces." };
  }
  // Code points, not UTF-16 units: an emoji is one character, not two.
  const characters = Array.from(typed);
  const unknown = characters.find((character) => !KNOWN.has(character.toUpperCase()));
  if (unknown !== undefined) {
    const upper = unknown.toUpperCase();
    const shown = Array.from(upper).length === 1 ? upper : unknown;
    return {
      ok: false,
      problem: `No letter “${shown}”: a word can use only the letters A to Z, without accents.`,
    };
  }
  const word = typed.toUpperCase();
  if (characters.length > MAX_APP_WORD_LETTERS) {
    return {
      ok: false,
      problem: `At most ${MAX_APP_WORD_LETTERS} letters: each needs ${LETTER_DISTANCE_M / 1000} km, and the app goes up to ${MAX_APP_DISTANCE_KM} km.`,
    };
  }
  const needs = wordDistanceM(word);
  if (distanceM !== null && distanceM < needs) {
    return {
      ok: false,
      problem: `“${word}” needs at least ${needs / 1000} km: ${LETTER_DISTANCE_M / 1000} km for each letter.`,
      needsDistanceM: needs,
    };
  }
  return { ok: true, word };
}

/** The route's name on screen: the word, or the shape (TASK-057). */
export function routeName(request: RouteRequest): string {
  return request.word ? `“${request.word}”` : String(request.shape);
}
