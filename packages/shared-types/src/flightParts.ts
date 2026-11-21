/**
 * A race on foot and in the air, hike & fly (TASK-305 part R6a, ADR-0375
 * «precisazione R6»; the user's choice of 2026-11-12, «Dentro Paragliding»):
 * the phone divides a flight into its parts on foot and in the air
 * (src/air/flightParts.ts) and sends them with the run's figures (PUT
 * /me/activities/{key}/stats, `flight_parts`). The API keeps them, only for
 * a flight, with their times on the clock of the run's track, and adds each
 * kind up (`flight_split`) when the flight has both: every list of posts
 * gives it, for «On foot {time} · In the air {time}». Mirrors
 * services/api/shaperoute_api/run_stats.py.
 *
 * A server before part R6a refuses `flight_parts` (422): the server goes
 * first, the app after.
 */

/** At most this many parts in a flight. */
export const FLIGHT_PARTS_MAX = 200;

export type FlightPartKind = "foot" | "air";

/** A part as the phone sends it: its times on the phone's clock, the one of
 * the track's `time_ms`. */
export interface FlightPartRequest {
  kind: FlightPartKind;
  start_ms: number;
  end_ms: number;
  /** Its time, pauses left out: never more than it lasts. */
  moving_s: number;
  metres: number;
  /** The metres climbed in it. */
  climb_m: number;
  /** Its highest point; null without heights. */
  max_alt_m: number | null;
}

/** A part as the API keeps it: its times in seconds from the first point
 * of the run's track. */
export interface FlightPart {
  kind: FlightPartKind;
  start_s: number;
  end_s: number;
  moving_s: number;
  metres: number;
  climb_m: number;
  max_alt_m: number | null;
}

/** The parts of one kind added up. */
export interface FlightSide {
  seconds: number;
  metres: number;
  climb_m: number;
  max_alt_m: number | null;
}

/** A flight with parts on foot and in the air. */
export interface FlightSplit {
  foot: FlightSide;
  air: FlightSide;
}
