/**
 * The bests of the air (TASK-305 part R5a, ADR-0375, docs/API.md «I record
 * del volo»): one's own highest, longest, farthest and fastest flight, for
 * the card under «Record your flight». Mirrors
 * services/api/shaperoute_api/run_stats.py (FlightBestsBody).
 */

/** The bounds of what the phone sends for a flight with its figures
 * (PUT /me/activities/{key}/stats); ignored for any other sport. */
export const MIN_FLIGHT_ALT_M = -1_000;
export const MAX_FLIGHT_ALT_M = 10_000;
/** Faster over the ground than any paraglider, as the live link's bound. */
export const MAX_FLIGHT_MPS = 100;

/** What a flight adds to its figures (fixtures/flight-stats-request.json). */
export interface FlightStatsRequest {
  /** Its highest point from the GPS, in metres; null for none. */
  max_alt_m?: number | null;
  /** Its top speed over the ground, in metres a second; null for none. */
  top_speed_mps?: number | null;
}

/** One best and the flight it was made in. */
export interface FlightBest {
  /** The key the app gave the flight, as in /me/activities. */
  id: string;
  started_at: string;
  value: number;
}

/**
 * GET /me/flight-bests: only the owner. Each null when no flight has it; a
 * flight deleted takes its bests with it. At equal values the first flown
 * keeps it.
 */
export interface FlightBests {
  /** The highest point, in metres. */
  highest: FlightBest | null;
  /** The longest flight, in seconds, pauses left out. */
  longest: FlightBest | null;
  /** The longest flight in metres. */
  farthest: FlightBest | null;
  /** The top speed over the ground, in metres a second. */
  fastest: FlightBest | null;
}
