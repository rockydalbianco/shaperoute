import {
  type DrawingDetail,
  type LatLon,
  MAX_OUTLINE_POINTS,
} from "@shaperoute/shared-types";

import { type AnyRouteRequest, isImageRequest } from "../api/routes";
import { CLOSED_SHARE, firstLineOf } from "../mapdraw/drawing";
import { drawingOf, type FigureLines } from "../mapdraw/edit";
import { boxOf, dist } from "../mapdraw/geometry";
import { fromPlane, toPlane } from "../mapdraw/plane";

/**
 * The lines of a figure the app proposes, as «Edit the drawing» puts them
 * on the map of «Draw on the map» (TASK-320, TASK-331): a route asked for,
 * the points of a route run. In the engine's frame, [-1, 1] with y up;
 * `drawingOf` (mapdraw/edit.ts) makes the drawing of them. A shape of the
 * catalogue — an emoji — is not changed, so it has none (ADR-0288). The
 * track of a member's drawing goes on the map where it was run and as big
 * (TASK-346, ADR-0299): with its lines, its middle and its size. Since
 * TASK-369 (ADR-0313) so does the line of every route and drawing, an emoji
 * and a word too: the track, not the figure asked for.
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
 * The line of a route run where it was run and as big: centred on the
 * middle of its box and scaled into [-1, 1], y up, in metres on the plane
 * (never in degrees), so it is put back on the map just where it was. A
 * line that ends near its start (CLOSED_SHARE) is one closed outline of at
 * most MAX_OUTLINE_POINTS corners, as a favorite keeps the outline of an
 * image (`favoriteRoute.outlineOf`). One that ends away from it is closed
 * too, by a straight side from its end back to its start (TASK-425,
 * ADR-0353): hung open on a ring at its start (TASK-369) the route ran it
 * out and back, twice the distance of the track. When closing it makes no
 * outline (`drawingOf`) — it crosses itself, or the side back crosses it —
 * the closed line is a loop hung on a ring at its start (TASK-428,
 * ADR-0356): a detail that ends on its own first point is run once, and a
 * detail may cross itself. Only when that makes no drawing either does it
 * stay open, as a first line drawn on the map does (`firstLineOf`,
 * TASK-331), run out and back.
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
  const units = atCentre.map(([x, y]): [number, number] => [x / unitM, y / unitM]);
  const closed: FigureLines = { outline: closedOutline(units), details: [] };
  if (drawingOf(closed) === null) {
    // A track that ends at its start and crosses itself there — an out and
    // back on one street, a figure eight — is a loop too (TASK-410):
    // without it «Edit & run» had nothing to put on the map.
    const loop = loopLines(units);
    if (loop !== null && drawingOf(loop) !== null) {
      return { lines: loop, centre, unitM };
    }
    const open = endsAway(units) ? openLines(units) : null;
    if (open !== null) {
      return { lines: open, centre, unitM };
    }
  }
  return { lines: closed, centre, unitM };
}

/** The track as one closed outline of at most MAX_OUTLINE_POINTS corners:
 * a last side back to its first point when it does not end on it. */
function closedOutline(units: readonly [number, number][]): [number, number][] {
  const outline = spread(units, MAX_OUTLINE_POINTS);
  const [first, last] = [outline[0], outline[outline.length - 1]];
  return first[0] === last[0] && first[1] === last[1] ? outline : [...outline, first];
}

/** Whether a track ends away from its start (CLOSED_SHARE of its size). */
function endsAway(units: readonly [number, number][]): boolean {
  const { size } = boxOf([units]);
  return dist(units[0], units[units.length - 1]) > CLOSED_SHARE * size;
}

/** The lines of a track that ends away from its start, as a first line
 * drawn on the map that stays open; null for one with more points than a
 * route runs (it is then closed). */
function openLines(units: readonly [number, number][]): FigureLines | null {
  const lines = firstLineOf(units);
  return lines === null || "problem" in lines ? null : lines;
}

/** The open lines of a track with a last side from the end of the line
 * back to its first point: a loop, run once (TASK-428). Whole, where
 * `outlineOf` would keep the largest ring of a line that crosses itself
 * and cut the rest. Null when the track makes no open lines. */
function loopLines(units: readonly [number, number][]): FigureLines | null {
  const open = openLines(units);
  if (open === null || open.details.length !== 1) {
    return null;
  }
  const line = open.details[0];
  return { outline: open.outline, details: [[...line, line[0]]] };
}

/** What a member's drawing says of its figure (GET /drawings/{id}). */
type DrawnRun = Pick<DrawingDetail, "track">;

/**
 * The track of a member's drawing (TASK-320 part B), where it was run
 * (TASK-346): the one line the API gives of it, whatever it draws — a
 * picture, a figure drawn by hand, an emoji, a word, a free run, one
 * imported from another app, a drawing paddled (TASK-369, ADR-0313). Null
 * for a post of photos alone and a track too short to follow.
 */
export function drawingTrack(drawing: DrawnRun): TrackInPlace | null {
  return drawing.track.length >= 2 ? trackInPlace(drawing.track) : null;
}

/**
 * The line of a route of «Explore» where it is (TASK-369, ADR-0313): an
 * example, a search, a favorite, a drawing of a message, an example of the
 * Feed, a shape «NEAR YOU», a themed route, by the points of its result.
 * Null for a route too short to follow.
 */
export function routeTrack(points: readonly LatLon[]): TrackInPlace | null {
  return points.length >= 2 ? trackInPlace(points) : null;
}
