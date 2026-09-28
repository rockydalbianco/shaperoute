import type { OutlinePoint } from "@shaperoute/shared-types";

/** How far the board zooms in: a detail of an eye, not a pixel. */
export const MAX_SCALE = 8;

/** The zoom of the board: a scale around the picture's centre, then a
 * shift, in points of the board. */
export type BoardView = { scale: number; x: number; y: number };
export const FIT: BoardView = { scale: 1, x: 0, y: 0 };

/** Where the picture sits on the board unzoomed, in points of the board. */
export type Box = { left: number; top: number; width: number; height: number };

type Point = [x: number, y: number];

/** The largest box of the picture's proportions that fits the board,
 * centred in it. */
export function fitBox(boardWidth: number, boardHeight: number, aspect: number): Box {
  const width = Math.min(boardWidth, boardHeight * aspect);
  const height = width / aspect;
  return {
    left: (boardWidth - width) / 2,
    top: (boardHeight - height) / 2,
    width,
    height,
  };
}

function centreOf(box: Box): Point {
  return [box.left + box.width / 2, box.top + box.height / 2];
}

/** A point of the board, as shares of the picture under it, kept inside
 * the picture. */
export function shareAt([px, py]: Point, view: BoardView, box: Box): OutlinePoint {
  const [cx, cy] = centreOf(box);
  const x = (px - cx - view.x) / view.scale + box.width / 2;
  const y = (py - cy - view.y) / view.scale + box.height / 2;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return [clamp(x / box.width), clamp(y / box.height)];
}

/** The view kept so the picture never leaves the board: its edge can come
 * at most to the board's centre. */
export function clampView(view: BoardView, box: Box): BoardView {
  const scale = Math.min(MAX_SCALE, Math.max(1, view.scale));
  const limit = (v: number, side: number) => {
    const room = (scale * side) / 2;
    return Math.min(room, Math.max(-room, v));
  };
  return { scale, x: limit(view.x, box.width), y: limit(view.y, box.height) };
}

/** Two fingers as they touched down: their middle, their distance, and the
 * view then. */
export type Pinch = { centre: Point; distance: number; view: BoardView };

export function pinchOf(a: Point, b: Point, view: BoardView): Pinch {
  return {
    centre: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
    distance: Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1])),
    view,
  };
}

/**
 * The view after two fingers moved from `start` to `a` and `b`: zoomed by
 * how much they spread, and shifted so the point of the picture under
 * their middle stays under it.
 */
export function pinched(start: Pinch, a: Point, b: Point, box: Box): BoardView {
  const now = pinchOf(a, b, start.view);
  const scale = Math.min(
    MAX_SCALE,
    Math.max(1, (start.view.scale * now.distance) / start.distance),
  );
  const [cx, cy] = centreOf(box);
  // The picture's point under the fingers, from its centre, unzoomed.
  const ux = (start.centre[0] - cx - start.view.x) / start.view.scale;
  const uy = (start.centre[1] - cy - start.view.y) / start.view.scale;
  return clampView(
    { scale, x: now.centre[0] - cx - scale * ux, y: now.centre[1] - cy - scale * uy },
    box,
  );
}

/** The view after one finger moved the picture by `dx`, `dy`. */
export function panned(start: BoardView, dx: number, dy: number, box: Box): BoardView {
  return clampView({ ...start, x: start.x + dx, y: start.y + dy }, box);
}
