import type { ImageOutline } from "@shaperoute/shared-types";

import { type Look, lookOf } from "../mapdraw/figure";
import { lineLength } from "../mapdraw/geometry";
import { drawnApart, piecesOf } from "./imagePieces";

/**
 * How a traced picture is drawn and sized on the map (TASK-449 part B), as
 * «Draw» will ask it (`imageAsked`). With the pen down, its outline and the
 * strokes that hang the other subjects on it, each run there and back: the
 * look of a picture of «Draw on the map». Drawn apart, its outline and its
 * pieces, and the distance is of what is drawn alone (the engine's
 * `pen_up.drawn_m`). The route starts on the outline's first point.
 */
export function pictureLook(outline: ImageOutline, penUp: boolean): Look {
  if (drawnApart(outline, penUp)) {
    const lines = [outline.points, ...piecesOf(outline)];
    return {
      lines,
      length: lines.reduce((total, line) => total + lineLength(line), 0),
      start: outline.points[0],
    };
  }
  return lookOf({
    kind: "picture",
    outline: outline.points,
    strokes: outline.strokes ?? [],
  });
}
