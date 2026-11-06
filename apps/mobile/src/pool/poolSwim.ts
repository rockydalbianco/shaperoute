import {
  POOL_LENGTH_MAX_M,
  POOL_LENGTH_MIN_M,
  POOL_LENGTHS_MAX,
  POOL_MAX_SPEED_M_S,
  type PoolPause,
  type PoolSwimRequest,
} from "@shaperoute/shared-types";

/**
 * A swim in a pool as the phone keeps it while it lasts (TASK-400 part B,
 * ADR-0334): the pool chosen before it, when it began, its pauses and its
 * end. No GPS: the time is that of the clock; the lengths are written at
 * the end («How many lengths?»), with an estimate from the time. Every
 * change is a new value, so the screen, the file and the tests read the
 * same thing.
 */

/** A «Pause», in ms since the epoch; `toMs` null while it lasts. */
export type PoolSwimPause = { fromMs: number; toMs: number | null };

export type PoolSwim = {
  /** Its key on the API (gymKey.ts makes it the same way). */
  key: string;
  /** The pool, in metres, to the centimetre (33.33). */
  poolLengthM: number;
  startedMs: number;
  pauses: PoolSwimPause[];
  /** When «Stop» was held; null while it lasts. */
  endedMs: number | null;
};

/** The pace of a first swim in a pool, without one before it to go by:
 * 2:00 /100 m (ADR-0334, point 3). */
export const DEFAULT_PACE_S_PER_100 = 120;

/** The longest swim the API keeps (pool_swims.py, as a workout). */
export const MAX_POOL_SWIM_MS = 24 * 3_600_000;

export function newPoolSwim(key: string, poolLengthM: number, nowMs: number): PoolSwim {
  return { key, poolLengthM, startedMs: nowMs, pauses: [], endedMs: null };
}

/** Whether the swim is in «Pause». */
export function isPaused(swim: PoolSwim): boolean {
  return swim.pauses.some((pause) => pause.toMs === null);
}

export function pausePoolSwim(swim: PoolSwim, nowMs: number): PoolSwim {
  if (swim.endedMs !== null || isPaused(swim)) {
    return swim;
  }
  return { ...swim, pauses: [...swim.pauses, { fromMs: nowMs, toMs: null }] };
}

export function resumePoolSwim(swim: PoolSwim, nowMs: number): PoolSwim {
  if (swim.endedMs !== null || !isPaused(swim)) {
    return swim;
  }
  return {
    ...swim,
    pauses: swim.pauses.map((pause) =>
      pause.toMs === null ? { ...pause, toMs: Math.max(pause.fromMs, nowMs) } : pause,
    ),
  };
}

/** «Stop» held: it ends now, a «Pause» under way at its end. */
export function finishPoolSwim(swim: PoolSwim, nowMs: number): PoolSwim {
  if (swim.endedMs !== null) {
    return swim;
  }
  const endedMs = Math.min(
    Math.max(nowMs, swim.startedMs),
    swim.startedMs + MAX_POOL_SWIM_MS,
  );
  return {
    ...resumePoolSwim(swim, endedMs),
    endedMs,
  };
}

/** Its time at `nowMs` (or at its end): from start to now without the
 * pauses, as the API counts it. */
export function activeMs(swim: PoolSwim, nowMs: number): number {
  const end = swim.endedMs ?? nowMs;
  const paused = swim.pauses.reduce(
    (total, pause) =>
      total +
      Math.max(0, Math.min(pause.toMs ?? end, end) - Math.min(pause.fromMs, end)),
    0,
  );
  return Math.max(0, end - swim.startedMs - paused);
}

/** The metres of `lengths` of the pool, to the metre as the API keeps them. */
export function poolMetres(lengths: number, poolLengthM: number): number {
  return Math.round(lengths * poolLengthM);
}

/** The pace, in seconds per 100 m: time × 100 / metres; null without metres. */
export function pacePer100S(activeS: number, metres: number): number | null {
  return metres > 0 && activeS > 0 ? (activeS * 100) / metres : null;
}

/**
 * The lengths «How many lengths?» proposes (ADR-0334, point 3):
 * round(time / (pace × pool / 100)), with the average pace of the last
 * swims in a pool or 2:00 /100 m; at least 1, at most 1000.
 */
export function estimateLengths(
  activeS: number,
  poolLengthM: number,
  paceS100: number | null,
): number {
  const pace = paceS100 !== null && paceS100 > 0 ? paceS100 : DEFAULT_PACE_S_PER_100;
  const lengthS = (pace * poolLengthM) / 100;
  const estimate = lengthS > 0 ? Math.round(activeS / lengthS) : 1;
  return Math.min(POOL_LENGTHS_MAX, Math.max(1, estimate));
}

/** Whether `lengths` is a number of lengths the API takes: 1 to 1000. */
export function isLengths(lengths: number): boolean {
  return Number.isInteger(lengths) && lengths >= 1 && lengths <= POOL_LENGTHS_MAX;
}

/** Whether `lengths` of the pool in `activeS` is faster than 2.5 m/s, past
 * the world records: the API would answer 422, so the phone says so first. */
export function isTooFast(activeS: number, metres: number): boolean {
  return metres > 0 && (activeS <= 0 || metres / activeS > POOL_MAX_SPEED_M_S);
}

/** Whether `metres` is a pool the API takes: 10 to 100 m, to the cm. */
export function isPoolLength(metres: number): boolean {
  return (
    Number.isFinite(metres) &&
    metres >= POOL_LENGTH_MIN_M &&
    metres <= POOL_LENGTH_MAX_M &&
    Math.abs(Math.round(metres * 100) - metres * 100) < 1e-6
  );
}

/** The pool written in «Other» («33.33», «33,33»): its metres, or null for
 * one out of 10–100 m or with more than two decimals. */
export function parsePoolLength(text: string): number | null {
  const written = text.trim().replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(written)) {
    return null;
  }
  const metres = Number(written);
  return isPoolLength(metres) ? metres : null;
}

/** The lengths written («60»): the number, or null for one that is none. */
export function parseLengths(text: string): number | null {
  const written = text.trim();
  if (!/^\d{1,4}$/.test(written)) {
    return null;
  }
  const lengths = Number(written);
  return isLengths(lengths) ? lengths : null;
}

/** The body of PUT /me/pool-swims/{key}; null before its end, or with
 * lengths the API would refuse (too many, too fast). */
export function poolSwimRequest(
  swim: PoolSwim,
  lengths: number,
): PoolSwimRequest | null {
  if (swim.endedMs === null || !isLengths(lengths) || !isPoolLength(swim.poolLengthM)) {
    return null;
  }
  const endedMs = swim.endedMs;
  const activeS = activeMs(swim, endedMs) / 1000;
  if (isTooFast(activeS, poolMetres(lengths, swim.poolLengthM))) {
    return null;
  }
  const endS = (endedMs - swim.startedMs) / 1000;
  const pauses: PoolPause[] = swim.pauses
    .map((pause) => ({
      from_s: Math.max(0, (pause.fromMs - swim.startedMs) / 1000),
      to_s: Math.min(endS, ((pause.toMs ?? endedMs) - swim.startedMs) / 1000),
    }))
    .filter((pause) => pause.to_s > pause.from_s);
  return {
    started_at: new Date(swim.startedMs).toISOString(),
    ended_at: new Date(endedMs).toISOString(),
    pauses,
    pool_length_m: swim.poolLengthM,
    lengths,
  };
}
