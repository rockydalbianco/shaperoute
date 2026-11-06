/**
 * A swim in a pool (TASK-400, ADR-0334, docs/API.md «Pool swim»): a run of
 * the activity `swimming` saved without a track, the pool and the lengths in
 * place of a line. Mirrors services/api/shaperoute_api/pool_swims.py.
 */

/** The pool chosen before the swim: 25 m, 50 m or one written («Other»),
 * in metres, kept to the centimetre (33.33 m). */
export const POOL_LENGTH_MIN_M = 10;
export const POOL_LENGTH_MAX_M = 100;
/** The lengths written at the end («How many lengths?»). */
export const POOL_LENGTHS_MAX = 1000;
/** Faster than this the API answers 422: the lengths or the pool were
 * written wrong. */
export const POOL_MAX_SPEED_M_S = 2.5;

/** A pause («Pause»), in seconds since the swim began: out of its time. */
export interface PoolPause {
  from_s: number;
  to_s: number;
}

/** PUT /me/pool-swims/{key}: fixtures/pool-swim.json. */
export interface PoolSwimRequest {
  started_at: string;
  ended_at: string;
  pauses?: PoolPause[];
  pool_length_m: number;
  lengths: number;
}

/** The swim as saved: 201 the first time, then 200 with it unchanged.
 * `duration_s` is the API's, from start to end without the pauses;
 * `distance_m` the lengths times the pool, to the metre. */
export interface PoolSwim {
  id: string;
  started_at: string;
  duration_s: number;
  distance_m: number;
  pool_length_m: number;
  lengths: number;
}

/** GET /drawings/{id}/pool-swim: what the post of a swim in a pool shows
 * besides the run's time and metres; 404 for an app that does not read it
 * (X-MuW-Reads). */
export interface PoolSwimFigures {
  pool_length_m: number;
  lengths: number;
}
