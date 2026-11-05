import { MAX_OUTLINE_POINTS, type Shape } from "@shaperoute/shared-types";

import { type Figure, lookOf, type Placed, turnedUnit, type Unit } from "./figure";
import { simplify } from "./geometry";

/**
 * The figure of «Draw on the map» turned (TASK-402 part A, ADR-0336): by a
 * tap, by the degrees typed, or by two fingers. The angle is the figure's
 * on the map (`Placed.turnDeg`), clockwise, as the engine's `rotation_deg`;
 * the figure's own units stay as they are, so the tools work on it turned
 * too. The engine starts from this angle and may still turn the figure up
 * to ±45° to find the roads (TASK-232).
 */

/** What «−15°» and «+15°» turn the figure by. */
export const TURN_STEP_DEG = 15;
/** Two fingers turning less than this leave the figure as it was: sizing it
 * does not twist it. */
export const MIN_TURN_DEG = 3;

/** `deg` within (−180°, 180°], a whole degree. */
export function normalDeg(deg: number): number {
  const whole = Math.round(deg) % 360;
  const within = whole > 180 ? whole - 360 : whole <= -180 ? whole + 360 : whole;
  // −0 is 0.
  return within || 0;
}

/** The angle of `placed` on the map. */
export function turnOf(placed: Placed): number {
  return placed.turnDeg ?? 0;
}

/** `placed` at `deg` on the map; at 0° without an angle, as before. */
export function turnedTo(placed: Placed, deg: number): Placed {
  const turnDeg = normalDeg(deg);
  if (turnDeg === turnOf(placed)) {
    return placed;
  }
  const { turnDeg: _, ...rest } = placed;
  return turnDeg === 0 ? rest : { ...rest, turnDeg };
}

/** `placed` turned `deg` more, clockwise. */
export function turnedBy(placed: Placed, deg: number): Placed {
  return turnedTo(placed, turnOf(placed) + deg);
}

/** The lines of a figure turned `deg` clockwise. */
export function turnedLines(
  lines: readonly (readonly Unit[])[],
  deg: number,
): Unit[][] {
  return lines.map((line) => line.map((point) => turnedUnit(point, deg)));
}

/** The outline of each shape of the catalogue as a picture, made once. */
const SHAPE_OUTLINES = new Map<Shape, Figure>();

/** Straightened a little more each time, until it has few enough corners. */
const SIMPLIFY_STEP = 0.005;

/**
 * A shape of the catalogue as an outline (ADR-0336, point 3): its line drawn
 * with the pen down, with no more corners than the contract takes. A shape
 * asked by its name has no angle; turned, it is asked by its outline.
 */
export function shapeOutline(shape: Shape): Figure {
  let made = SHAPE_OUTLINES.get(shape);
  if (made === undefined) {
    const line = lookOf({ kind: "shape", shape }).lines[0];
    let outline: Unit[] = [...line];
    for (let tolerance = SIMPLIFY_STEP; outline.length > MAX_OUTLINE_POINTS;) {
      outline = simplify(line, tolerance);
      tolerance += SIMPLIFY_STEP;
    }
    made = { kind: "picture", outline, strokes: [] };
    SHAPE_OUTLINES.set(shape, made);
  }
  return made;
}

/**
 * The figure as it is drawn and asked: a shape of the catalogue turned is
 * its outline; at 0° it is the shape by its name again. Anything else is
 * itself.
 */
export function shownFigure(placed: Placed): Figure {
  const figure = placed.figure;
  return figure.kind === "shape" && turnOf(placed) !== 0
    ? shapeOutline(figure.shape)
    : figure;
}
