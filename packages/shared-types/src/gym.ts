/**
 * A workout at the gym (TASK-385, ADR-0327, docs/API.md «Gym»): a run saved
 * without a track, its sets in place of a line. Mirrors
 * services/api/shaperoute_api/gym_sessions.py; the catalog of the exercises
 * is fixtures/gym-exercises.json, the same as gym_catalog.py.
 */

/** The kinds of set (docs/sports/gym.md): reps and kg, reps of the body
 * (with a weight added, if any), seconds, or a block on a cardio machine. */
export const GYM_SET_KINDS = ["load", "bodyweight", "timed", "cardio"] as const;
export type GymSetKind = (typeof GYM_SET_KINDS)[number];

/** One set, or one block on a cardio machine. Only the fields of its kind:
 * `reps` and `load_kg` for a load (per hand for a dumbbell), `reps` and an
 * optional `load_kg` for a set of the body, `duration_s` for a timed one,
 * `duration_s` and what its machine shows for a cardio block. */
export interface GymSet {
  /** Its key in the catalog; absent for an exercise the runner named. */
  exercise?: string;
  /** What the runner called it, 1–40 characters; absent for one of the
   * catalog. */
  name?: string;
  kind: GymSetKind;
  reps?: number;
  load_kg?: number;
  duration_s?: number;
  distance_m?: number;
  speed_kmh?: number;
  incline_pct?: number;
  level?: number;
  floors?: number;
  /** When it was logged, in seconds since the workout began. */
  at_s: number;
  /** Logged during the workout; false for one added after it ended. */
  live: boolean;
}

/** A pause («Pause»), in seconds since the workout began: out of its time.
 * A rest between two sets is no pause. */
export interface GymPause {
  from_s: number;
  to_s: number;
}

/** PUT /me/gym-sessions/{key}: fixtures/gym-session.json. */
export interface GymSessionRequest {
  started_at: string;
  ended_at: string;
  pauses?: GymPause[];
  /** How many rests the timer counted, and their seconds summed. */
  rests?: number;
  rest_s?: number;
  /** «Show exercises» on its post; true when absent. */
  show_exercises?: boolean;
  sets?: GymSet[];
  /** The key of the plan it followed (TASK-411 C); absent without one. */
  plan?: string;
}

/** The workout as saved: 201 the first time, then 200 with it unchanged.
 * `duration_s` is the API's: from start to end without the pauses. */
export interface GymSession {
  id: string;
  started_at: string;
  duration_s: number;
  rests: number;
  rest_s: number;
  show_exercises: boolean;
  sets: GymSet[];
  /** The key of the plan it followed; absent without one. */
  plan?: string;
}

/** GET /drawings/{id}/exercises: what the post of a workout shows; 404
 * when its owner hides them, or for an app that does not read `gym` and
 * `trackless` (X-MuW-Reads). */
export interface GymExercises {
  rests: number;
  rest_s: number;
  sets: GymSet[];
  /** The levels this workout reached first (part E), the highest first;
   * missing from an API older than TASK-385 E. */
  new_levels?: GymLevel[];
}

/** What a milestone reads (docs/sports/gym.md «I tipi di serie»): the kg of
 * a load (per hand for a dumbbell), the reps of a set of the body, the
 * seconds of a timed set or of a machine without distance, the metres of a
 * cardio block. */
export const GYM_LEVEL_MEASURES = [
  "load_kg",
  "reps",
  "duration_s",
  "distance_m",
] as const;
export type GymLevelMeasure = (typeof GYM_LEVEL_MEASURES)[number];

/** The level of an exercise of the catalog (TASK-385 E, ADR-0327 point 9):
 * its best set under the cap, of every workout of the account, private ones
 * too; `level` 1–7 is the figure `figures[level - 1]` of
 * fixtures/gym-exercises.json. Mirrors gym_levels.py. */
export interface GymLevel {
  exercise: string;
  level: number;
  value: number;
  measure: GymLevelMeasure;
}

/** A row of the monthly leaderboard (TASK-385 F, ADR-0327 point 9): a
 * person's best live set of the month, read as the milestones read it. A
 * tie goes to the set logged first. */
export interface GymLeaderboardRow {
  /** 1 is the first; a row kept apart by a block is missing, the others
   * keep their rank. */
  rank: number;
  user: { public_id: string; username: string };
  value: number;
  /** The post of the workout: open it, report it. */
  drawing_id: string;
}

/** GET /gym/leaderboard?exercise=&month=: a calendar month of Rome
 * (YYYY-MM, this one when not asked), the first 50 and who asks. Mirrors
 * gym_leaderboard.py. */
export interface GymLeaderboard {
  month: string;
  exercise: string;
  measure: GymLevelMeasure;
  /** Everyone on it, the rows kept apart too. */
  people: number;
  rows: GymLeaderboardRow[];
  mine: GymLeaderboardRow | null;
}

/** The people a leaderboard needs for its first to be a «Winner», once its
 * month has ended (the user's choice of 2026-11-06). */
export const GYM_WINNER_PEOPLE = 3;

/** A workout of the gym calendar (TASK-411 B, ADR-0341 point 2). */
export interface GymCalendarWorkout {
  /** The key the app gave it, as in /me/activities. */
  id: string;
  started_at: string;
  /** Pauses left out, rests in. */
  duration_s: number;
  /** Its post, when it has one the moderation has not hidden. */
  drawing_id: string | null;
  /** The name of the plan it followed (TASK-411 C); null for none, and
   * missing from an API older than part C. */
  plan?: string | null;
}

/** A day of a plan gone by without a workout of it (TASK-411 C). */
export interface GymCalendarSkipped {
  day: number;
  /** The plan's name. */
  plan: string;
}

/** A day of the month with at least one workout, on the asked time zone. */
export interface GymCalendarDay {
  /** 1–31. */
  day: number;
  /** The first first. */
  workouts: GymCalendarWorkout[];
}

/** GET /me/gym-calendar?tz=&month=: one's own workouts at the gym in a month
 * of the calendar on `tz` (YYYY-MM, this one when not asked), only the days
 * with a workout; and the last workout of all, for «Last workout» in Draw.
 * Only the owner. Mirrors gym_calendar.py. */
export interface GymCalendar {
  month: string;
  tz: string;
  count: number;
  duration_s: number;
  days: GymCalendarDay[];
  last: GymCalendarWorkout | null;
  /** Missing from an API older than TASK-411 C. */
  skipped?: GymCalendarSkipped[];
}

/** An exercise of a plan (TASK-411 C, ADR-0341 point 3): how many sets, and
 * the values aimed at, each optional, of the fields of its kind only. */
export interface GymPlanItem {
  exercise?: string;
  name?: string;
  kind: GymSetKind;
  /** 1–20. */
  sets: number;
  reps?: number;
  load_kg?: number;
  duration_s?: number;
  distance_m?: number;
  speed_kmh?: number;
  incline_pct?: number;
  level?: number;
  floors?: number;
}

/** PUT /me/gym-plans/{key}: a plan without its key. Sent older than the one
 * kept, it does not replace it. */
export interface GymPlanRequest {
  /** 1–40 characters. */
  name: string;
  /** The days of the week it is for, 1 Monday to 7 Sunday. */
  days: number[];
  /** At most 30, in order. */
  items: GymPlanItem[];
  /** Its place among the account's plans, 0–100. */
  position: number;
  /** When the phone last changed it. */
  updated_at: string;
}

/** A plan as kept, with the key the phone chose. */
export interface GymPlan extends GymPlanRequest {
  key: string;
}

/** GET /me/gym-plans: one's own, at most 20, in their order. */
export interface GymPlans {
  plans: GymPlan[];
}

/** How many plans an account keeps, and exercises a plan has. */
export const MAX_GYM_PLANS = 20;
export const MAX_GYM_PLAN_ITEMS = 30;

/** PUT /me/gym-sessions/{key}/show-exercises. */
export interface ShowExercisesRequest {
  show: boolean;
}
