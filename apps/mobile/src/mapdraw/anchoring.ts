import type { LatLon } from "@shaperoute/shared-types";

import { drawingScore, farStretches } from "./fidelity";
import type { Stroke } from "./matching";

/**
 * A drawing on the map anchored to the roads (TASK-347 part C, ADR-0300),
 * as the map and the panel under it show it: the figure as a ghost, the
 * route of the strokes the roads draw over it, the stretches where the
 * roads went far from the finger, and under the map «Snapping to roads…»,
 * the score, or the notice of a stroke in the fields.
 */

/** What the map draws of it. */
export type AnchoredLines = {
  /** The figure as a ghost: there are strokes to anchor. */
  ghost: boolean;
  /** The route of each stroke the roads draw. */
  snapped: LatLon[][];
  /** The stretches of it far from the finger. */
  far: LatLon[][];
};

/** What the panel under the map says of it. */
export type Anchoring = {
  /** A stroke is being anchored: «Snapping to roads…». */
  snapping: boolean;
  /** How closely the roads follow the drawing, 0 to 100; none before a
   * stroke is anchored. */
  score: number | null;
  /** A stroke is in the fields: it stays as drawn, with a notice. */
  offRoads: boolean;
};

/** Nothing anchored: a shape, a picture, no figure, or anchoring off. */
export const NOT_ANCHORED: AnchoredLines = { ghost: false, snapped: [], far: [] };
export const NOT_ANCHORING: Anchoring = {
  snapping: false,
  score: null,
  offRoads: false,
};

export function anchoredLines(strokes: readonly Stroke[]): AnchoredLines {
  if (strokes.length === 0) {
    return NOT_ANCHORED;
  }
  return {
    ghost: true,
    snapped: strokes.flatMap((stroke) =>
      stroke.state === "matched" &&
      stroke.match !== null &&
      stroke.match.points.length >= 2
        ? [stroke.match.points]
        : [],
    ),
    far: strokes.flatMap(farStretches),
  };
}

export function anchoringOf(strokes: readonly Stroke[], snapping: boolean): Anchoring {
  if (strokes.length === 0) {
    return NOT_ANCHORING;
  }
  return {
    snapping,
    score: drawingScore(strokes),
    offRoads: strokes.some((stroke) => stroke.state === "off_roads"),
  };
}
