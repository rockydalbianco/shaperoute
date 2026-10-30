import {
  type DrawingDetail,
  type LatLon,
  MAX_OUTLINE_POINTS,
} from "@shaperoute/shared-types";

import { type AnyRouteRequest, isImageRequest } from "../api/routes";
import type { FigureLines } from "../mapdraw/edit";
import { fromPlane, toPlane } from "../mapdraw/plane";

/**
 * The lines of a figure the app proposes, as «Edit the drawing» puts them
 * on the map of «Draw on the map» (TASK-320, TASK-331): a route asked for,
 * the points of a route run. In the engine's frame, [-1, 1] with y up;
 * `drawingOf` (mapdraw/edit.ts) makes the drawing of them. A shape of the
 * catalogue — an emoji — is not changed, so it has none (ADR-0288). The
 * track of a member's drawing goes on the map where it was run and as big
 * (TASK-346, ADR-0299): with its lines, its middle and its size.
 */

/**
 * The lines of the figure a route was asked for: a picture or a drawing by
 * the outline and the details it sent. Null for a shape of the catalogue
 * and for a word (letters with the pen up are not a closed figure).
 */
export function requestLines(request: AnyRouteRequest): FigureLines | null {
  return isImageRequest(request)
    ? { outline: request.outline, details: request.strokes ?? [] }
    : null;
}

/** The lines of a route run where it was run (TASK-346): in the frame of
 * the figure, with the point of the map at its middle and the metres of
 * one unit, so `figure.onMap` gives back the points of the track. */
export type TrackInPlace = { lines: FigureLines; centre: LatLon; unitM: number };

/** At most `size` points of the line, evenly spread, first and last kept. */
function spread<T>(points: readonly T[], size: number): T[] {
  if (points.length <= size) {
    return [...points];
  }
  const step = (points.length - 1) / (size - 1);
  return Array.from({ length: size }, (_, i) => points[Math.round(i * step)]);
}

/**
 * The line of a route run as one closed outline of at most
 * MAX_OUTLINE_POINTS corners, as a favorite keeps the outline of an image
 * (`favoriteRoute.outlineOf`): centred on the middle of its box and scaled
 * into [-1, 1], y up, in metres on the plane (never in degrees), so it is
 * put back on the map just where it was and as big.
 */
export function trackInPlace(points: readonly LatLon[]): TrackInPlace {
  const origin = points[0];
  const xys = points.map((point) => toPlane(origin, point));
  const xs = xys.map(([x]) => x);
  const ys = xys.map(([, y]) => y);
  const middle: [number, number] = [
    (Math.min(...xs) + Math.max(...xs)) / 2,
    (Math.min(...ys) + Math.max(...ys)) / 2,
  ];
  const centre = fromPlane(origin, middle);
  const atCentre = points.map((point) => toPlane(centre, point));
  const unitM = Math.max(
    (Math.max(...xs) - Math.min(...xs)) / 2,
    (Math.max(...ys) - Math.min(...ys)) / 2,
    1e-6,
  );
  const outline = spread(
    atCentre.map(([x, y]): [number, number] => [x / unitM, y / unitM]),
    MAX_OUTLINE_POINTS,
  );
  const [first, last] = [outline[0], outline[outline.length - 1]];
  const closed =
    first[0] === last[0] && first[1] === last[1] ? outline : [...outline, first];
  return { lines: { outline: closed, details: [] }, centre, unitM };
}

/** What a member's drawing says of its figure (GET /drawings/{id}). */
type DrawnRun = Pick<
  DrawingDetail,
  "shape" | "word" | "route_title" | "source" | "track"
>;

/**
 * The track of a member's drawing (TASK-320 part B), where it was run
 * (TASK-346): a picture, a photo or a figure drawn by hand — a planned
 * route that says only its title — by the track run, the one line the API
 * gives of it. Null for a shape of the catalogue, a word, a run without a
 * planned route (a free run, one imported from another app, a post of
 * photos alone) and a track too short to follow.
 */
export function drawingTrack(drawing: DrawnRun): TrackInPlace | null {
  if ((drawing.word !== null && drawing.word !== "") || drawing.shape !== null) {
    return null;
  }
  const planned = drawing.route_title !== null && drawing.source !== "file";
  return planned && drawing.track.length >= 2 ? trackInPlace(drawing.track) : null;
}
