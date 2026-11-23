import type { LatLon } from "@shaperoute/shared-types";

import { lengthOf, planeAt } from "./airGeometry";

/**
 * The last height of the ground the page read (TASK-479 part A1): where,
 * how high, when. «Height above ground» uses it only near where the pilot
 * is now and only while fresh; otherwise it shows «—».
 */

/** A ground height farther than this from the pilot is not theirs. */
export const GROUND_NEAR_M = 150;
/** A ground height older than this is not used. */
export const GROUND_FRESH_MS = 60_000;
/** The page is asked again once the pilot is this far from the last ask… */
export const ASK_AGAIN_M = 40;
/** …and never more often than this. */
export const ASK_EVERY_MS = 2_000;

export type Ground = { point: LatLon; altM: number; atMs: number };

let ground: Ground | null = null;

export function groundNow(): Ground | null {
  return ground;
}

export function setGround(next: Ground | null): void {
  ground = next;
}

function apart(a: LatLon, b: LatLon): number {
  const plane = planeAt(a);
  return lengthOf(plane(a), plane(b));
}

/** The pilot's height above the ground, metres, or null when not known. */
export function aboveGroundOf(
  here: LatLon | null,
  altM: number | null,
  nowMs: number,
  known: Ground | null = ground,
): number | null {
  if (here === null || altM === null || known === null) {
    return null;
  }
  if (
    nowMs - known.atMs > GROUND_FRESH_MS ||
    apart(known.point, here) > GROUND_NEAR_M
  ) {
    return null;
  }
  return altM - known.altM;
}

/** Whether to ask the page for the ground at `here`, after the last ask
 * (`asked`, null for none). */
export function askAgain(
  here: LatLon,
  nowMs: number,
  asked: { point: LatLon; atMs: number } | null,
): boolean {
  if (asked === null) {
    return true;
  }
  if (nowMs - asked.atMs < ASK_EVERY_MS) {
    return false;
  }
  return (
    apart(asked.point, here) >= ASK_AGAIN_M || nowMs - asked.atMs >= GROUND_FRESH_MS / 2
  );
}

/** For tests. */
export function resetGround(): void {
  ground = null;
}
