/**
 * A day of skiing's resort, gear and snow (TASK-406 part D1, ADR-0338,
 * docs/API.md «Ski resorts»). Mirrors services/api/shaperoute_api/ski_days.py.
 */

/** The snow chosen at the end of the day, one or none (the user's choice,
 * 2026-11-07): «Powder · Groomed · Icy · Spring · Heavy», in this order. */
export const SNOW_TYPES = ["powder", "groomed", "icy", "spring", "heavy"] as const;
export type SnowType = (typeof SNOW_TYPES)[number];

/** The gear is free text: «ski» or «snowboard» with brand and model. */
export const SKI_GEAR_MAX = 60;

/** PUT /me/activities/{key}/ski, after the day is saved, only for a day of
 * skiing (422 otherwise): fixtures/ski-day-request.json. Written whole, the
 * last one wins; null for what was not given, and a blank gear is none. */
export interface SkiDayRequest {
  /** A resort of GET /ski-resorts; 422 for an unknown one. */
  resort_id: string | null;
  gear: string | null;
  snow: SnowType | null;
}

/** The answer of the PUT, and GET /drawings/{id}/ski-day for whoever sees
 * the post: fixtures/ski-day.json. All null for a day without them and for
 * another sport. */
export interface SkiDay {
  resort: { id: string; name: string } | null;
  gear: string | null;
  snow: SnowType | null;
}

/**
 * A lift or a descent of a saved day (TASK-429 part C1, ADR-0357), as the
 * phone sent it in the run's figures (`ski_parts`, TASK-424 part C2b), with
 * the fixes of the post's track it covers and its lift's or piste's name.
 */
export interface SkiDayPart {
  kind: "lift" | "descent";
  /** Counted apart for lifts and descents, from 1: «L2», «3». */
  n: number;
  /** On the seconds of the server's track; null when not counted. */
  start_s: number | null;
  end_s: number | null;
  moving_s: number;
  metres: number;
  /** Climbed by a lift, dropped by a descent. */
  height_m: number;
  /** A descent's top speed; null for a lift. */
  top_mps: number | null;
  /** The first and the last fix of the post's track in it; null when none. */
  from_fix: number | null;
  to_fix: number | null;
  /** Its lift's or piste's name; null when none was found. */
  name: string | null;
}

/** GET /drawings/{id}/ski-day since TASK-429 part C1: the day and, when its
 * figures have them, its parts in the order of the day:
 * fixtures/ski-day-parts.json. Without them there is no `parts`. */
export interface SkiDayWithParts extends SkiDay {
  parts?: SkiDayPart[];
}

/** GET /ski-resorts/{id}/snow: the snow the members marked at the resort in
 * the 24 hours from `since`, from the posts the asker can see, as numbers
 * only: fixtures/resort-snow.json. The most marked first; empty when none. */
export interface ResortSnow {
  resort_id: string;
  since: string;
  snow: { snow: SnowType; days: number }[];
}
