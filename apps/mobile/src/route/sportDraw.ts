import { type Activity, type Shape, SHAPES } from "@shaperoute/shared-types";

import { isSnowshoeRoute } from "../snow/snow";
import { profileOf } from "../sports";
import type { ChoiceKind } from "./problems";

/**
 * What «Draw» asks for `activity` when `kind` was chosen: a word or a
 * picture that the sport does not draw waits for another sport, and the
 * shape is asked in its place (TASK-191 on the water, TASK-323 swimming,
 * TASK-414 in a wheelchair). Each sport says it in its profile.
 */
export function drawKindOf(kind: ChoiceKind, activity: Activity): ChoiceKind {
  const { noWords = false, noImages = false } = profileOf(activity);
  return (noWords && kind === "word") || (noImages && kind === "image")
    ? "shape"
    : kind;
}

/**
 * The shape «Draw» asks for `activity`: null when the sport draws only
 * some shapes and this is not one of them (TASK-414: a circle, a heart, a
 * star or a moon in a wheelchair), so a shape chosen before waits for
 * another sport instead of reaching the server, which would refuse it.
 */
export function shapeOfSport(shape: Shape | null, activity: Activity): Shape | null {
  const { shapes } = profileOf(activity);
  return shape !== null && shapes?.includes(shape) === false ? null : shape;
}

/**
 * True when `activity` takes a drawing by hand («Freehand», «Edit the
 * drawing»): not a sport that draws only some shapes (TASK-414), nor the
 * snow, where the engine places only a shape of the catalogue (TASK-413,
 * ON_SNOW_SHAPES_ONLY) and would refuse a drawing.
 */
export function drawsByHand(activity: Activity): boolean {
  return profileOf(activity).shapes === undefined && !isSnowshoeRoute(activity);
}

/**
 * What the row of figures under a route offers for `activity` (TASK-414):
 * the sport's shapes, the ready-made pictures when it draws pictures, and
 * «Edit the drawing» when it draws by hand. A wheelchair has its four
 * shapes and nothing else; on the water no picture, as in «Draw»; on the
 * snow no picture and no drawing by hand.
 */
export function figuresOf(activity: Activity): {
  shapes: readonly Shape[];
  pictures: boolean;
  editDrawing: boolean;
} {
  const { noImages = false, shapes } = profileOf(activity);
  return {
    shapes: shapes ?? SHAPES,
    pictures: !noImages,
    editDrawing: drawsByHand(activity),
  };
}
