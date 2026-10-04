import {
  type Activity,
  PEN_UP_SHAPES,
  type PenUpShape,
  type Shape,
} from "@shaperoute/shared-types";

/**
 * The shapes «Draw» offers with the pen up (TASK-223, ADR-0185): those the
 * user judged so on real roads, each piece drawn on its own and walked to.
 * The sun is drawn with the pen down; the eyes of the cat and the other
 * shapes of before wait for the user's judgement, though the API takes them
 * (PEN_UP_SHAPES).
 */
const OFFERED: ReadonlySet<Shape> = new Set<PenUpShape>(["smiley", "ghost", "donut"]);

/** Whether «Draw» offers `shape` with the pen up. */
export function offersPenUp(shape: Shape | null): shape is PenUpShape {
  return shape !== null && OFFERED.has(shape);
}

/** Whether `shape` names a shape that may be drawn with the pen up: a route
 * of it may have walks, as a word's (TASK-223). */
export function isPenUpShape(shape: string | null | undefined): shape is PenUpShape {
  return (PEN_UP_SHAPES as readonly unknown[]).includes(shape);
}

/**
 * What «Draw» sends for `shape`: with the pen up when the switch is on and
 * the shape is offered so, on the roads only (the API draws a shape on the
 * water with the pen down). Otherwise the request of before, field for
 * field.
 */
export function shapeAsked(
  shape: Shape,
  penUp: boolean,
  activity: Activity,
): { shape: Shape } | { shape: PenUpShape; pen_up: true } {
  return penUp && offersPenUp(shape) && activity !== "paddling"
    ? { shape, pen_up: true }
    : { shape };
}
