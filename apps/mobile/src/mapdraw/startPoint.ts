import { MAX_OUTLINE_POINTS } from "@shaperoute/shared-types";

import { isOpenLine, startRing } from "./drawing";
import { ON_LINE, awayFrom } from "./edit";
import { type Figure, lookOf, type Unit } from "./figure";
import { boxOf, dist, nearestOnSegment } from "./geometry";
import { shapeOutline } from "./turn";

/**
 * The start of the figure of «Draw on the map» moved along its line
 * (TASK-426, ADR-0354). The route starts on the first point of the outline
 * (`lookOf(...).start`), which the map shows as a dot; with «Move» a finger
 * drags the dot along the outline, and where it is left the outline starts
 * again: the figure stays where it is, and the request starts there. An
 * open line starts at one of its two ends. A shape of the catalogue moved
 * is asked by its outline, as one turned (ADR-0336); one asked with the pen
 * up keeps its start.
 */

/** The line the start may go along: the outline, or the two ends of an
 * open line (`ends`). In the figure's units. */
export type StartLine = { line: Unit[]; ends: boolean };

/** `line` the other way round, its first point where its last was. */
function reversed(line: readonly Unit[]): Unit[] {
  return [...line].reverse();
}

/** Whether an open line may start at its other end: not when it ends on a
 * loop, which the route runs once at its end, nor when another detail
 * hangs off its line elsewhere than on it (the small ring at its start,
 * which goes with the start). */
function turnsRound(details: readonly Unit[][]): boolean {
  const [line, ...others] = details;
  const last = line[line.length - 1];
  const loop = line.findIndex((p) => p[0] === last[0] && p[1] === last[1]);
  if (loop !== line.length - 1) {
    return false;
  }
  return others.every((detail) => awayFrom(detail[0], line) <= ON_LINE);
}

/**
 * Where the start of `figure` may go, as it is drawn: none for a shape
 * asked with the pen up (`apart`), nor for an open line that cannot be
 * turned round.
 */
export function startLineOf(figure: Figure, apart: boolean): StartLine | null {
  if (figure.kind === "shape") {
    return apart ? null : { line: lookOf(figure).lines[0], ends: false };
  }
  if (figure.kind === "drawing" && isOpenLine(figure.outline, figure.details)) {
    const line = figure.details[0];
    return turnsRound(figure.details)
      ? { line: [line[0], line[line.length - 1]], ends: true }
      : null;
  }
  return { line: figure.outline, ends: false };
}

/** An open drawing whose line starts at its other end, on a new small ring
 * there. */
function turnedRound(drawing: Extract<Figure, { kind: "drawing" }>): Figure {
  const [line, ...others] = drawing.details;
  const back = reversed(line);
  // As big as the ring of the line drawn (firstLineOf): by the line's size.
  const { size } = boxOf([line]);
  const ring = startRing(back[0], back[1], size);
  ring[ring.length - 1] = ring[0];
  back[0] = ring[0];
  return { ...drawing, outline: ring, details: [back, ...others] };
}

/**
 * The closed `outline` started again at the point of it nearest to `at`:
 * one of its corners when that point is within `reach` of it, or when the
 * outline has no room for another; else a new corner there. Null when the
 * start stays where it is.
 */
export function outlineFrom(
  outline: readonly Unit[],
  at: Unit,
  reach: number,
): Unit[] | null {
  const corners = outline.slice(0, -1);
  let best = { side: 0, point: corners[0], away: Infinity };
  for (let i = 1; i < outline.length; i += 1) {
    const point = nearestOnSegment(at, outline[i - 1], outline[i]);
    const away = dist(at, point);
    if (away < best.away) {
      best = { side: i - 1, point, away };
    }
  }
  const after = (best.side + 1) % corners.length;
  const nearer =
    dist(best.point, corners[best.side]) <= dist(best.point, corners[after])
      ? best.side
      : after;
  const full = corners.length >= MAX_OUTLINE_POINTS;
  let ring: Unit[];
  if (full || dist(best.point, corners[nearer]) <= Math.max(reach, ON_LINE)) {
    if (nearer === 0) {
      return null;
    }
    ring = [...corners.slice(nearer), ...corners.slice(0, nearer)];
  } else {
    ring = [
      best.point,
      ...corners.slice(best.side + 1),
      ...corners.slice(0, best.side + 1),
    ];
  }
  return [...ring, ring[0]];
}

/**
 * `figure` starting at the point of its line nearest to `at`, in its units,
 * a corner winning within `reach`: a shape of the catalogue becomes its
 * outline, as when turned; an open line goes the other way when `at` is
 * nearer its end. Null when the start stays where it is, or cannot move.
 */
export function startedAt(
  figure: Figure,
  at: Unit,
  reach: number,
  apart = false,
): Figure | null {
  if (startLineOf(figure, apart) === null) {
    return null;
  }
  const own = figure.kind === "shape" ? shapeOutline(figure.shape) : figure;
  if (own.kind === "drawing" && isOpenLine(own.outline, own.details)) {
    const line = own.details[0];
    return dist(at, line[line.length - 1]) < dist(at, line[0])
      ? turnedRound(own)
      : null;
  }
  if (own.kind === "shape") {
    return null;
  }
  const outline = outlineFrom(own.outline, at, reach);
  if (outline === null) {
    // A shape whose start stays is still the shape.
    return null;
  }
  return { ...own, outline };
}
