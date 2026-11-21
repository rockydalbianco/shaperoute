import type { LatLon } from "./index.ts";

/**
 * «Together» (TASK-417, ADR-0345 and its note D1, docs/API.md): the tracks
 * of a post's run and of the people tagged who ran it too, with their
 * times, for the run video. Only the post's author asks
 * GET /drawings/{id}/together; anybody else gets 404, as an API of before
 * does. Mirrors services/api/shaperoute_api/together.py.
 */

/** The author and at most three people tagged (the user's choice 4). */
export const TOGETHER_MAX_PEOPLE = 4;
/** At most this many stored points a track: some left out, none moved. */
export const TOGETHER_MAX_POINTS = 600;

/** A pause, in seconds since the first start of the group. */
export interface TogetherPause {
  from_s: number;
  to_s: number;
}

/** Somebody's run, on the clock of the group. */
export interface TogetherPerson {
  public_id: string;
  username: string;
  /** As stored: some left out, none moved. */
  points: LatLon[];
  /**
   * For each point, the seconds since the first start of the group: never
   * a time of day or a date. As long as `points`.
   */
  seconds: number[];
  pauses: TogetherPause[];
}

/**
 * GET /drawings/{id}/together: the author first, then the people tagged
 * who ran the same run, in the order of the tags; only the author when
 * nobody did.
 */
export interface TogetherPage {
  people: TogetherPerson[];
}
