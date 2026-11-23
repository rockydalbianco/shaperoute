/**
 * The season of a skier (TASK-429 part C1, ADR-0357, docs/API.md «Ski
 * resorts»). Mirrors services/api/shaperoute_api/ski_season.py.
 */

/** GET /me/ski-season?from=YYYY-MM-DD&to=YYYY-MM-DD: the asker's own days
 * of skiing that began between the two days, both counted, and the sums of
 * their lifts and descents: fixtures/ski-season.json. A day saved before
 * its parts were sent counts in `days` only. At most SKI_SEASON_MAX_DAYS. */
export interface SkiSeason {
  from: string;
  to: string;
  days: number;
  /** The days whose parts the sums below count. */
  days_with_parts: number;
  /** The metres of the descents. */
  skied_m: number;
  /** The metres skied down. */
  vertical_m: number;
  descents: number;
  lifts: number;
  /** The fastest descent's top speed; null without one. */
  top_mps: number | null;
  /** The time on the move, lifts and descents. */
  moving_s: number;
}

export const SKI_SEASON_MAX_DAYS = 400;
