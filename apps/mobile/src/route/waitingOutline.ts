import type { OutlinePoint } from "@shaperoute/shared-types";

import { type AnyRouteRequest, isImageRequest } from "../api/routes";
import { shapeScale } from "./shapeScale";

/**
 * Lines given y up, in any units, as shares of a square box, y down, the
 * drawing centred in it: the frame `shapeScale` gives and `segmentsOf`
 * draws. Points alone are left out; nothing to draw, null.
 */
export function inSquare(lines: readonly OutlinePoint[][]): OutlinePoint[][] | null {
  const drawn = lines.filter((line) => line.length > 1);
  const points = drawn.flat();
  if (points.length === 0) {
    return null;
  }
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  const side = Math.max(maxX - minX, maxY - minY);
  if (!(side > 0)) {
    return null;
  }
  const left = minX - (side - (maxX - minX)) / 2;
  const top = maxY + (side - (maxY - minY)) / 2;
  return drawn.map((line) =>
    line.map(([x, y]): OutlinePoint => [(x - left) / side, (top - y) / side]),
  );
}

/**
 * The outline to show while `request` is drawn (TASK-442), as shares of a
 * square box, y down: only what the app already has. A shape of the
 * catalogue, the engine's own outline as the preview of «Draw» shows it
 * (`shapeScale`); an image or a drawing, the outline and the details the
 * request itself carries. A word has no letters on the phone: null, and the
 * wait stays as it was. Where the route will be is not known yet: this is
 * a shape to look at, not a place on the map.
 */
export function waitingOutline(request: AnyRouteRequest): OutlinePoint[][] | null {
  if (isImageRequest(request)) {
    return inSquare([request.outline, ...(request.strokes ?? [])]);
  }
  if (request.shape === null || request.shape === undefined) {
    return null;
  }
  const { lines } = shapeScale(request.shape, request.distance_m);
  return lines.some((line) => line.length > 1) ? lines : null;
}
