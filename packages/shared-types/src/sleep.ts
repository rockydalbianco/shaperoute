/**
 * The nights of sleep a person publishes (TASK-467 part B1, ADR-0380,
 * docs/API.md «Sleep»). MuW works its sleep score out on the phone, from
 * what Apple Health holds (ADR-0379); the server keeps only the summary of
 * a night its owner published, never the samples and no hour of going to
 * bed or of waking. Mirrors services/api/shaperoute_api/sleep.py.
 *
 * A night is published in two ways, each with a switch of its own: on the
 * profile (`shared`, off until its owner turns it on) and in the post of
 * an activity (`shown`, on unless its owner turns it off). To anyone else
 * a night not shared, or not shown, is as one that is not there: 404.
 */

/** MuW's sleep score: a whole number from 0 to this. */
export const SLEEP_SCORE_MAX = 100;
/** A night is within a day: the most minutes asleep, or awake. */
export const SLEEP_NIGHT_MAX_MIN = 1440;
/** «Sleep last night» is the night before the activity: its `night` is at
 * most this many days from the day the activity began (UTC), or 422. */
export const SLEEP_ACTIVITY_NIGHT_APART_DAYS = 2;
/** `shared` of a night not kept yet, when a request leaves it out. */
export const SLEEP_SHARED_DEFAULT = false;
/** `shown` when a request leaves it out: the sleep in an activity's post
 * starts on (the user's choice of 2026-11-12). */
export const SLEEP_SHOWN_DEFAULT = true;

/** The minutes in each stage a watch told: Apple Health's «REM», «Core»
 * (MuW's «Light») and «Deep». Together they are `asleep_min` at most:
 * sleep of no told stage is in `asleep_min` only. */
export interface SleepStages {
  rem_min: number;
  light_min: number;
  deep_min: number;
}

/** What the phone worked out of a night. */
export interface SleepFigures {
  /** MuW's sleep score, a whole number. */
  score: number;
  /** Whole minutes asleep: 1 at least. */
  asleep_min: number;
  /** Whole minutes awake between falling asleep and the last waking. */
  awake_min: number;
  /** Left out for a night no watch told the stages of. */
  stages?: SleepStages;
}

/** A night as others read it: GET /users/{id}/sleep, the latest night its
 * owner shares on the profile, and GET /drawings/{id}/sleep, the night in
 * the post of an activity. fixtures/sleep-summary.json. */
export interface SleepSummary extends SleepFigures {
  /** The day the person woke up, as the phone's calendar has it:
   * YYYY-MM-DD. */
  night: string;
}

/** PUT /me/sleep/{night}: fixtures/sleep-night-request.json. With `shared`
 * left out it stays as it was. Answers the night, or 204 when nothing
 * publishes it (not shared, in no post): it is then not kept. */
export interface SleepNightRequest extends SleepFigures {
  shared?: boolean;
}

/** PATCH /me/sleep/{night}: on or off the profile; 204 as above. */
export interface SleepSharedRequest {
  shared: boolean;
}

/** A night as its owner reads it: GET and PUT /me/sleep/{night}.
 * fixtures/sleep-night.json. */
export interface SleepNight extends SleepSummary {
  shared: boolean;
}

/** PUT /me/activities/{key}/sleep: the night before the activity, kept
 * with these figures and given to it. fixtures/sleep-activity-request.json. */
export interface ActivitySleepRequest extends SleepSummary {
  /** «Sleep last night»: whether others see it in the post; true when
   * left out. */
  shown?: boolean;
}

/** PATCH /me/activities/{key}/sleep: the switch alone. */
export interface SleepShownRequest {
  shown: boolean;
}

/** The night of an activity as its owner reads it: GET, PUT and PATCH
 * /me/activities/{key}/sleep. fixtures/sleep-activity.json. */
export interface ActivitySleep extends SleepSummary {
  shown: boolean;
}
