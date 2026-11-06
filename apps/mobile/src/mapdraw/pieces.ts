import {
  type LatLon,
  MAX_DETAIL_POINTS,
  MAX_OUTLINE_POINTS,
} from "@shaperoute/shared-types";

import {
  linkedOf,
  nearestOn,
  placedDrawing,
  SIMPLIFY_SHARE,
  SNAP_SHARE,
  travelledPoints,
} from "./drawing";
import { awayFrom } from "./edit";
import {
  type Figure,
  lookOf,
  onMap,
  type Placed,
  turnedUnit,
  type Unit,
  unitsOn,
} from "./figure";
import { boxOf, type P, simplify } from "./geometry";
import { fromPlane, toPlane } from "./plane";
import { shapeOutline, turnedBy } from "./turn";

/**
 * The pieces of «Draw on the map» (TASK-402 part B, ADR-0336): the figure
 * on the map is a list of pieces, each with its own lines in units, its
 * middle, its size and its angle. The first gives the outline, as a figure
 * alone does; the lines of the others are details hung on the drawing with
 * the shortest link, dashed (TASK-331 part B). Joined, they are one drawing:
 * the `ImageOutline` of today, the same request and contract. One piece
 * alone is the figure as it always was.
 */

/** At most this many pieces in one drawing. */
export const MAX_PIECES = 6;
/** A piece added is this share of the figure's size. */
export const NEW_PIECE_SHARE = 1 / 3;
/** The box drawn around the piece chosen, this share of its size away from
 * its lines. */
export const BOX_SHARE = 0.08;

/** Why a piece was not added: there are as many as there may be. */
export type PieceProblem = "too_many";

/** The lines of a piece in its own units: an outline, closed, and the
 * details hung on it, with whether each starts with a link. */
type PieceLines = { outline: Unit[]; details: Unit[][]; linked: boolean[] };

/** The figure on the map joined into one drawing, and, line by line, the
 * piece each line is of. */
export type Joined = { placed: Placed; owners: number[] };

/** `line` closed on its first point. */
function closedRing(line: readonly Unit[]): Unit[] {
  const [first, last] = [line[0], line[line.length - 1]];
  return first[0] === last[0] && first[1] === last[1] ? [...line] : [...line, first];
}

/** The lines of `figure` as a piece: a shape of the catalogue by its
 * outline, as one turned is asked (ADR-0336, point 3). */
function ownLines(figure: Figure): PieceLines {
  const own = figure.kind === "shape" ? shapeOutline(figure.shape) : figure;
  if (own.kind === "drawing") {
    return { outline: own.outline, details: own.details, linked: linkedOf(own) };
  }
  const outline = own.kind === "picture" ? own.outline : lookOf(own).lines[0];
  const details = own.kind === "picture" ? own.strokes : [];
  return { outline, details, linked: details.map(() => false) };
}

/** The lines of each figure added as a piece, made once. */
const ADDED = new WeakMap<Figure, PieceLines>();

/** The lines of a piece added: straightened as the engine's outlines are
 * (SIMPLIFY_SHARE), so a few of them fit in one route. */
function addedLines(figure: Figure): PieceLines {
  let made = ADDED.get(figure);
  if (made === undefined) {
    const own = ownLines(figure);
    const tolerance = SIMPLIFY_SHARE * boxOf([own.outline, ...own.details]).size;
    const outline = closedRing(simplify(closedRing(own.outline), tolerance));
    made = {
      // A ring needs three corners at least.
      outline: outline.length >= 4 ? outline : closedRing(own.outline),
      details: own.details.map((detail) => simplify(detail, tolerance)),
      linked: own.linked,
    };
    ADDED.set(figure, made);
  }
  return made;
}

/** The lines of the piece at `index`: the first as it is, the others as
 * added pieces are. */
function linesOf(piece: Placed, index: number): PieceLines {
  return index === 0 ? ownLines(piece.figure) : addedLines(piece.figure);
}

/** All the lines of the piece at `index`, the outline first. */
export function pieceLines(piece: Placed, index: number): Unit[][] {
  const { outline, details } = linesOf(piece, index);
  return [outline, ...details];
}

/** The distance the piece at `index` makes alone, in metres. */
export function pieceDistance(piece: Placed, index: number): number {
  const { outline, details } = linesOf(piece, index);
  return lookOf({ kind: "drawing", outline, details }).length * piece.unitM;
}

/**
 * The outline of a piece, `ring` in metres, hung on the `lines` before it
 * as a detail: from its corner nearest to them, round once. Within
 * SNAP_SHARE of the drawing's `size` it starts on them; farther, a straight
 * link joins it there, run there and back.
 */
function hungRing(
  ring: readonly P[],
  lines: readonly (readonly P[])[],
  size: number,
): { detail: P[]; linked: boolean } {
  const corners = ring.slice(0, -1);
  let best = { k: 0, ...nearestOn(corners[0], lines) };
  corners.forEach((corner, k) => {
    const near = nearestOn(corner, lines);
    if (near.away < best.away) {
      best = { k, ...near };
    }
  });
  const round = [...corners.slice(best.k), ...corners.slice(0, best.k)];
  if (best.away <= SNAP_SHARE * size) {
    return { detail: [best.at, ...round.slice(1), best.at], linked: false };
  }
  return { detail: [best.at, ...round, round[0]], linked: true };
}

/**
 * The pieces joined into one drawing, on the plane of the first piece's
 * middle: the first piece's outline and details as they are; then, piece
 * by piece, its outline hung on what is there (`hungRing`) and its details
 * on its outline. The drawing is in units of half its size, unturned: the
 * angles are in its lines.
 */
export function joinedPieces(pieces: readonly Placed[]): Joined {
  const origin = pieces[0].centre;
  const inMetres = (piece: Placed, line: readonly Unit[]): P[] =>
    line.map((point) => toPlane(origin, onMap(piece, point)));
  const lines: P[][] = [];
  const linked: boolean[] = [];
  const owners: number[] = [];
  pieces.forEach((piece, index) => {
    const own = linesOf(piece, index);
    const outline = inMetres(piece, own.outline);
    const details = own.details.map((detail) => inMetres(piece, detail));
    if (index === 0) {
      lines.push(outline, ...details);
      linked.push(...own.linked);
      owners.push(...lines.map(() => 0));
      return;
    }
    const { size } = boxOf([...lines, outline]);
    const ring = hungRing(outline, lines, size);
    const from = lines.length;
    lines.push(ring.detail);
    linked.push(ring.linked);
    owners.push(index);
    details.forEach((detail, k) => {
      // On its own piece, where straightening the piece may have moved it.
      const near = nearestOn(detail[0], lines.slice(from));
      lines.push([near.at, ...detail.slice(1)]);
      linked.push(own.linked[k]);
      owners.push(index);
    });
  });
  const [outline, ...details] = lines;
  const drawn = placedDrawing(origin, outline, details);
  const figure = drawn.figure.kind === "drawing" ? drawn.figure : null;
  return {
    placed: figure === null ? drawn : { ...drawn, figure: { ...figure, linked } },
    owners,
  };
}

/** Whether the joined pieces are what one route runs: the contract's
 * points for the outline and the details. */
export function fitsRoute(joined: Joined): boolean {
  const figure = joined.placed.figure;
  return (
    figure.kind === "drawing" &&
    figure.outline.length <= MAX_OUTLINE_POINTS + 1 &&
    travelledPoints(figure.details) <= MAX_DETAIL_POINTS
  );
}

/**
 * The pieces held by fingers or turned together: the first piece's middle
 * moved to `centre`, all `factor` times bigger and turned `turn` degrees
 * clockwise about it, each where it was from the first. With the middle of
 * the first piece, its size and its turn known, the page's move is known
 * for every point (a similarity).
 */
export function heldPieces(
  pieces: readonly Placed[],
  centre: LatLon,
  factor: number,
  turn: number,
): Placed[] {
  const from = pieces[0].centre;
  const deg = Math.round(turn);
  return pieces.map((piece, index) => {
    const [x, y] = turnedUnit(toPlane(from, piece.centre), deg);
    const held = {
      ...piece,
      centre: index === 0 ? centre : fromPlane(centre, [factor * x, factor * y]),
      unitM: piece.unitM * factor,
    };
    return turnedBy(held, deg);
  });
}

/** The middle of the box around all the pieces, on the map. */
function middleOfPieces(pieces: readonly Placed[]): LatLon {
  const origin = pieces[0].centre;
  const lines = pieces.flatMap((piece, index) =>
    pieceLines(piece, index).map((line) =>
      line.map((point) => toPlane(origin, onMap(piece, point))),
    ),
  );
  return fromPlane(origin, boxOf(lines).middle);
}

/** All the pieces turned `deg` more, clockwise, about their middle. */
export function piecesTurnedBy(pieces: readonly Placed[], deg: number): Placed[] {
  const middle = middleOfPieces(pieces);
  const [x, y] = turnedUnit(toPlane(middle, pieces[0].centre), Math.round(deg));
  return heldPieces(pieces, fromPlane(middle, [x, y]), 1, deg);
}

/** All the pieces `factor` times bigger, about the first one's middle. */
export function piecesSized(pieces: readonly Placed[], factor: number): Placed[] {
  return factor === 1 ? [...pieces] : heldPieces(pieces, pieces[0].centre, factor, 0);
}

/**
 * A new piece of `figure` in `middle`, a third of the figure's size
 * (NEW_PIECE_SHARE), unturned.
 */
export function addedPiece(
  pieces: readonly Placed[],
  figure: Figure,
  middle: LatLon,
): Placed {
  const whole = boxOf(
    pieces.flatMap((piece, index) =>
      pieceLines(piece, index).map((line) =>
        line.map((point) => toPlane(middle, onMap(piece, point))),
      ),
    ),
  ).size;
  const own = boxOf(pieceLines({ figure, centre: middle, unitM: 1 }, 1)).size;
  return { figure, centre: middle, unitM: (NEW_PIECE_SHARE * whole) / own };
}

/** The box of `lines`: its least and its greatest x and y. */
function boundsOf(lines: readonly (readonly Unit[])[]): [Unit, Unit] {
  const points = lines.flat();
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return [
    [Math.min(...xs), Math.min(...ys)],
    [Math.max(...xs), Math.max(...ys)],
  ];
}

/**
 * The piece at `point` on the map, a finger's `reachM` away at most: the
 * one whose lines are nearest within reach; else the smallest whose box it
 * is in. Null outside all of them.
 */
export function pieceAt(
  pieces: readonly Placed[],
  point: LatLon,
  reachM: number,
): number | null {
  let near: { index: number | null; away: number } = { index: null, away: reachM };
  let inside: { index: number | null; size: number } = { index: null, size: Infinity };
  pieces.forEach((piece, index) => {
    const lines = pieceLines(piece, index);
    for (const line of lines) {
      const away = awayFrom(
        [0, 0],
        line.map((p) => toPlane(point, onMap(piece, p))),
      );
      if (away <= near.away) {
        near = { index, away };
      }
    }
    const [low, high] = boundsOf(lines);
    const [x, y] = unitsOn(piece, point);
    const reach = reachM / piece.unitM;
    const size = Math.max(high[0] - low[0], high[1] - low[1]) * piece.unitM;
    if (
      x >= low[0] - reach &&
      x <= high[0] + reach &&
      y >= low[1] - reach &&
      y <= high[1] + reach &&
      size < inside.size
    ) {
      inside = { index, size };
    }
  });
  return near.index ?? inside.index;
}

/** The box around the piece at `index` on the map, turned with it,
 * closed: drawn round the piece chosen. */
export function pieceBox(piece: Placed, index: number): LatLon[] {
  const [low, high] = boundsOf(pieceLines(piece, index));
  const room = BOX_SHARE * Math.max(high[0] - low[0], high[1] - low[1]);
  const corners: Unit[] = [
    [low[0] - room, low[1] - room],
    [high[0] + room, low[1] - room],
    [high[0] + room, high[1] + room],
    [low[0] - room, high[1] + room],
  ];
  return [...corners, corners[0]].map((corner) => onMap(piece, corner));
}
