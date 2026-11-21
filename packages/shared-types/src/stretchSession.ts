/**
 * A stretching session (TASK-475, ADR-0386, docs/API.md «Stretching»): a run
 * of the activity `stretching` saved without a track, the routine it
 * followed in place of a line. Mirrors
 * services/api/shaperoute_api/stretch_sessions.py.
 */

/** The minutes a routine may be chosen in: 3, 5 or 10 today. */
export const STRETCH_MINUTES_MAX = 60;
/** The exercises of a session, «Skip» left out. */
export const STRETCH_EXERCISES_MAX = 100;
/** A session longer than this is refused (422). */
export const STRETCH_SESSION_MAX_S = 4 * 3600;
/** The routine's key on the phone: `morning`, `afterRun`, `afterGym`. */
export const STRETCH_ROUTINE_PATTERN = /^[A-Za-z0-9_]{1,40}$/;

/** A pause («Pause»), in seconds since the session began: out of its time. */
export interface StretchPause {
  from_s: number;
  to_s: number;
}

/** PUT /me/stretch-sessions/{key}: fixtures/stretch-session.json. */
export interface StretchSessionRequest {
  started_at: string;
  ended_at: string;
  pauses?: StretchPause[];
  routine: string;
  minutes: number;
  exercises: number;
}

/** The session as saved: 201 the first time, then 200 with it unchanged.
 * `duration_s` is the API's, from start to end without the pauses. */
export interface StretchSession {
  id: string;
  started_at: string;
  duration_s: number;
  routine: string;
  minutes: number;
  exercises: number;
}

/** GET /drawings/{id}/stretch: what the post of a session shows besides the
 * run's time; 404 for an app that does not read it (X-MuW-Reads). */
export interface StretchFigures {
  routine: string;
  minutes: number;
  exercises: number;
}
