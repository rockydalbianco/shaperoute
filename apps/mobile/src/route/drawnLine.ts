import { MAX_DRAWN_POINTS, type OutlinePoint } from "@shaperoute/shared-types";

/** A finger moves a hair between two touch events: points closer than this,
 * in shares of the picture, add nothing to a drawing. */
export const MIN_STEP_SHARE = 0.01;

/**
 * The line drawn with a finger, ready for the API (TASK-079): the first and
 * last points, and in between only those at least `minStep` from the one
 * kept before; at most MAX_DRAWN_POINTS, evenly picked if more.
 */
export function thinLine(
  points: OutlinePoint[],
  minStep: number,
  max: number = MAX_DRAWN_POINTS,
): OutlinePoint[] {
  if (points.length <= 2) {
    return points;
  }
  const kept: OutlinePoint[] = [points[0]];
  for (const point of points.slice(1, -1)) {
    const [x, y] = kept[kept.length - 1];
    if (Math.hypot(point[0] - x, point[1] - y) >= minStep) {
      kept.push(point);
    }
  }
  kept.push(points[points.length - 1]);
  if (kept.length <= max) {
    return kept;
  }
  return Array.from(
    { length: max },
    (_, i) => kept[Math.round((i * (kept.length - 1)) / (max - 1))],
  );
}

/** A point of a touch as shares of the box it is in, kept inside it. */
export function shareOf(
  x: number,
  y: number,
  width: number,
  height: number,
): OutlinePoint {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return [clamp(x / width), clamp(y / height)];
}
