import { type LatLon, MAX_STROKE_M, MAX_STROKE_POINTS } from "@shaperoute/shared-types";

import { boxOf, dist, lineLength, type P, simplify } from "./geometry";
import { fromPlane, toPlane } from "./plane";

/**
 * A line drawn with a finger on the map, made into the strokes sent to be
 * anchored to the roads (TASK-347 part C, ADR-0300): resampled every few
 * metres, smoothed, straightened, and cut where it is too long for one
 * request (MAX_STROKE_POINTS, MAX_STROKE_M). Done on the plane in metres
 * tangent at the line's first point, never in degrees.
 */

/** The line is resampled at this step, in metres, before smoothing: the page
 * sends a point every 3 px, closer where the finger is slow. */
export const STEP_M = 10;
/** Rounds of Chaikin's corner cutting: two take the jitter of a finger off
 * and keep the corners it meant. */
export const SMOOTH_ROUNDS = 2;
/** Straightened like the drawing (drawing.ts, ADR-0068): corners closer than
 * this share of the line's size to it are dropped. */
export const SIMPLIFY_SHARE = 0.01;
/** Never straightened by less than this, in metres: a short line is not
 * worth a point every metre. */
export const MIN_TOLERANCE_M = 2;
/** Nor by more than this: 1% of a drawing of 25 km would flatten turns of
 * 200 m the finger meant, and the roads to choose between with them. */
export const MAX_TOLERANCE_M = 30;
/** A piece is cut a little short of MAX_STROKE_M, so the engine, measuring
 * it again, never finds it over. */
export const PIECE_M = MAX_STROKE_M - 100;

/** The points of a line, without one equal to the one before. */
function distinct(line: readonly P[]): P[] {
  return line.filter((p, i) => i === 0 || dist(p, line[i - 1]) > 0);
}

/** A point every `step` metres along `line`, its first and last kept. */
export function resampled(line: readonly P[], step: number = STEP_M): P[] {
  const points = distinct(line);
  if (points.length < 2) {
    return points;
  }
  const out: P[] = [points[0]];
  let left = step;
  for (let i = 1; i < points.length; i += 1) {
    let [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    let side = Math.hypot(bx - ax, by - ay);
    while (side >= left) {
      const t = left / side;
      ax += (bx - ax) * t;
      ay += (by - ay) * t;
      out.push([ax, ay]);
      side -= left;
      left = step;
    }
    left -= side;
  }
  const last = points[points.length - 1];
  if (dist(out[out.length - 1], last) > 0) {
    out.push(last);
  }
  return out;
}

/** Chaikin's corner cutting, `rounds` times, the two ends kept where the
 * finger put them. */
export function smoothed(line: readonly P[], rounds: number = SMOOTH_ROUNDS): P[] {
  let points = [...line];
  for (let round = 0; round < rounds && points.length > 2; round += 1) {
    const next: P[] = [points[0]];
    for (let i = 0; i < points.length - 1; i += 1) {
      const [ax, ay] = points[i];
      const [bx, by] = points[i + 1];
      next.push([0.75 * ax + 0.25 * bx, 0.75 * ay + 0.25 * by]);
      next.push([0.25 * ax + 0.75 * bx, 0.25 * ay + 0.75 * by]);
    }
    next.push(points[points.length - 1]);
    points = next;
  }
  return points;
}

/** `line` with a point added along every side longer than `maxM`, so that
 * no side is longer than a piece may be. */
function shortSides(line: readonly P[], maxM: number): P[] {
  const out: P[] = line.length > 0 ? [line[0]] : [];
  for (let i = 1; i < line.length; i += 1) {
    const [ax, ay] = line[i - 1];
    const [bx, by] = line[i];
    const parts = Math.ceil(dist(line[i - 1], line[i]) / maxM);
    for (let k = 1; k < parts; k += 1) {
      out.push([ax + ((bx - ax) * k) / parts, ay + ((by - ay) * k) / parts]);
    }
    out.push(line[i]);
  }
  return out;
}

/** `drawn` cut into pieces of at most `maxPoints` points and `maxM` metres,
 * each starting where the one before ends; a side longer than `maxM` is
 * cut too. */
export function pieces(
  drawn: readonly P[],
  maxPoints: number = MAX_STROKE_POINTS,
  maxM: number = PIECE_M,
): P[][] {
  if (drawn.length < 2) {
    return [];
  }
  const line = shortSides(drawn, maxM);
  const out: P[][] = [];
  let piece: P[] = [line[0]];
  let length = 0;
  for (let i = 1; i < line.length; i += 1) {
    const side = dist(line[i - 1], line[i]);
    if (piece.length >= 2 && (piece.length >= maxPoints || length + side > maxM)) {
      out.push(piece);
      piece = [line[i - 1]];
      length = 0;
    }
    piece.push(line[i]);
    length += side;
  }
  out.push(piece);
  return out;
}

/**
 * The strokes to anchor for a line drawn with a finger, in order: resampled,
 * smoothed, straightened at 1% of its size (2–30 m), cut where too long. None for a
 * tap (one point, or all in one place).
 */
export function strokesOf(line: readonly LatLon[]): LatLon[][] {
  if (line.length < 2) {
    return [];
  }
  const origin = line[0];
  const plane = distinct(line.map((point) => toPlane(origin, point)));
  if (plane.length < 2) {
    return [];
  }
  const smooth = smoothed(resampled(plane));
  const tolerance = Math.min(
    MAX_TOLERANCE_M,
    Math.max(MIN_TOLERANCE_M, SIMPLIFY_SHARE * boxOf([smooth]).size),
  );
  const straight = simplify(smooth, tolerance);
  if (straight.length < 2 || lineLength(straight) === 0) {
    return [];
  }
  return pieces(straight).map((piece) => piece.map((xy) => fromPlane(origin, xy)));
}
