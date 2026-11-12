import type { Activity, Shape } from "@shaperoute/shared-types";

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
