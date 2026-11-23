import type { LiveStats } from "@shaperoute/shared-types";

import type { BodyProfile } from "../body/bodyProfile";
import { tracklessStats } from "../liveShare/liveStats";
import { poolKcal } from "./poolKcal";
import {
  activeMs,
  DEFAULT_PACE_S_PER_100,
  estimateLengths,
  type PoolSwim,
  poolMetres,
} from "./poolSwim";

/**
 * What the live link of a swim in a pool sends (TASK-424 part B2): no
 * points, the time without the pauses, the lengths estimated from the pace
 * as «How many lengths?» proposes them, the calories of those lengths, and
 * the watch's heart rate when there is one.
 */

/** The lengths swum by `activeS`, estimated from the pace: as
 * `estimateLengths`, but none before the first half length, where «How
 * many lengths?» still proposes one. */
export function liveLengths(
  activeS: number,
  poolLengthM: number,
  paceS100: number | null,
): number {
  const pace = paceS100 !== null && paceS100 > 0 ? paceS100 : DEFAULT_PACE_S_PER_100;
  if (activeS < (pace * poolLengthM) / 200) {
    return 0;
  }
  return estimateLengths(activeS, poolLengthM, paceS100);
}

/** The numbers of `swim` at `atMs`. */
export function poolLiveStats(
  swim: PoolSwim,
  atMs: number,
  paceS100: number | null,
  body: BodyProfile,
  bpm: number | null,
): LiveStats {
  const timeMs = activeMs(swim, atMs);
  const activeS = timeMs / 1000;
  const lengths = liveLengths(activeS, swim.poolLengthM, paceS100);
  const kcal = poolKcal(
    poolMetres(lengths, swim.poolLengthM),
    activeS,
    body,
    new Date(swim.startedMs).getFullYear(),
  );
  return tracklessStats({ activeMs: timeMs, kcal, bpm, lengths });
}
