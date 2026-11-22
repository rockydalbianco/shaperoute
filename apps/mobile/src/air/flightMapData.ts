import type { LatLon } from "@shaperoute/shared-types";

import type { Track, TrackFix } from "../navigation/trackRecorder";
import { bearingBetween, lengthOf, planeAt } from "./airGeometry";
import { lastStretch } from "./instrument";

/**
 * What the flight map draws (TASK-479 part A1, ADR-0388), worked out on the
 * phone so the map page only draws:
 * - the track in pieces, each with its climb, for the colours of the fixed
 *   −3…+3 m/s scale;
 * - the course the map turns to with «Heading up»: the last 5 s, held while
 *   circling, so the map does not spin in a thermal.
 */

/** A piece of track ends once this far from where it starts… */
export const PIECE_M = 25;
/** …or this long after, whichever first. */
export const PIECE_MS = 5_000;
/** At most this many pieces go to the map: a longer flight takes longer
 * pieces. */
export const MAX_PIECES = 1_500;
/** The climbs are told to the map in steps of this much. */
export const CLIMB_STEP = 0.5;

/** The course is read over this long. */
export const COURSE_MS = 5_000;
/** Under this many metres over COURSE_MS, the course of before is kept. */
export const COURSE_MIN_M = 15;

export type VarioPiece = {
  /** [lon, lat] pairs, as the map wants them. */
  line: [number, number][];
  /** m/s, in CLIMB_STEP steps. */
  climbMps: number;
};

function heightOf(fix: TrackFix): number | null {
  const height = fix.altitudeM;
  return height === undefined || height === null || !Number.isFinite(height)
    ? null
    : height;
}

function lonLat(point: LatLon): [number, number] {
  return [point[1], point[0]];
}

function stepped(mps: number): number {
  return Math.round(mps / CLIMB_STEP) * CLIMB_STEP || 0;
}

/**
 * The track since `fromMs` (the take-off; all of it with null) in pieces
 * coloured by their climb. Pieces of the same climb in a row are one line;
 * a gap in the recording breaks the line.
 */
export function varioPieces(track: Track, fromMs: number | null = null): VarioPiece[] {
  const fixes = track.fixes.filter(
    (fix) => heightOf(fix) !== null && (fromMs === null || fix.timeMs >= fromMs),
  );
  if (fixes.length < 2) {
    return [];
  }
  const plane = planeAt(fixes[0].point);
  // Longer pieces for a long flight: a piece ends by its length or by its
  // time, so each takes half of MAX_PIECES at most.
  const spanMs = fixes[fixes.length - 1].timeMs - fixes[0].timeMs;
  let lengthM = 0;
  for (let i = 1; i < fixes.length; i += 1) {
    lengthM += lengthOf(plane(fixes[i - 1].point), plane(fixes[i].point));
  }
  const pieceMs = Math.max(PIECE_MS, spanMs / (MAX_PIECES / 2));
  const pieceM = Math.max(PIECE_M, lengthM / (MAX_PIECES / 2));
  // The ends of the pieces.
  const ends: TrackFix[] = [fixes[0]];
  for (let i = 1; i < fixes.length; i += 1) {
    const from = ends[ends.length - 1];
    const fix = fixes[i];
    const far = lengthOf(plane(from.point), plane(fix.point)) >= pieceM;
    const long = fix.timeMs - from.timeMs >= pieceMs;
    if (far || long || fix.gap === true || i === fixes.length - 1) {
      ends.push(fix);
    }
  }
  const pieces: VarioPiece[] = [];
  // Whether the last piece ends where the next one starts: not over a gap.
  let joinable = false;
  for (let i = 1; i < ends.length; i += 1) {
    const a = ends[i - 1];
    const b = ends[i];
    const seconds = (b.timeMs - a.timeMs) / 1000;
    if (b.gap === true || seconds <= 0) {
      joinable = false;
      continue;
    }
    const climbMps = stepped(
      ((heightOf(b) as number) - (heightOf(a) as number)) / seconds,
    );
    const last = pieces[pieces.length - 1];
    if (joinable && last !== undefined && last.climbMps === climbMps) {
      last.line.push(lonLat(b.point));
    } else {
      pieces.push({ line: [lonLat(a.point), lonLat(b.point)], climbMps });
    }
    joinable = true;
  }
  return pieces;
}

/**
 * The course for «Heading up», degrees from north: the way the pilot went
 * over the last COURSE_MS. While circling, or when the pilot has hardly
 * moved, the course of before (`previous`) stays, so the map holds still.
 */
export function courseOf(
  track: Track,
  circling: boolean,
  previous: number | null,
): number | null {
  if (circling) {
    return previous;
  }
  const fixes = lastStretch(track.fixes);
  const last = fixes[fixes.length - 1];
  if (last === undefined) {
    return previous;
  }
  let first = fixes.length - 1;
  while (first > 0 && last.timeMs - fixes[first - 1].timeMs <= COURSE_MS) {
    first -= 1;
  }
  const from = fixes[first];
  const plane = planeAt(from.point);
  if (lengthOf(plane(from.point), plane(last.point)) < COURSE_MIN_M) {
    return previous;
  }
  return Math.round(bearingBetween(from.point, last.point));
}
