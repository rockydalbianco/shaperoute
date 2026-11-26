import type { LatLon } from "@shaperoute/shared-types";

import type { Look, Unit } from "../mapdraw/figure";
import { fromPlane, type Xy } from "../mapdraw/plane";

/**
 * The live preview of «Draw» (TASK-449, ADR-0412): where a shape would lie
 * on the map from a start, at a distance, before any route is asked for.
 * The first point of its outline on the start, north up, as long as the
 * distance: the first placement the engine tries (ROUTE_ENGINE.md §3), not
 * the one it will choose. Only the ideal outline, never a route; all of it
 * in metres on the plane tangent at the start, never in degrees.
 */

/** A piece of ground the preview looks at: its middle in metres from the
 * start (x east, y north), and how wide and tall it is. */
export type Frame = { centre: Xy; widthM: number; heightM: number };

/** A dash of the outline in the box, as a thin box turned along it. */
export type Dash = { left: number; top: number; length: number; angle: number };

export type LivePreview = {
  frame: Frame;
  /** Two opposite corners of the frame on the map: a line whose fit in the
   * box is the frame itself (`lineCamera`, no padding). */
  corners: [LatLon, LatLon];
  /** Names the frame: the same picture of the map for as long as it stays. */
  key: string;
  /** The outline on the map, its first point on the start. */
  lines: LatLon[][];
  /** The outline in the box, in points, y down. */
  points: Xy[][];
  /** The start in the box, in points. */
  dot: Xy;
  /** The shape's width and height on the ground, in metres. */
  widthM: number;
  heightM: number;
};

/** A piece of ground a frame may look at, in metres across; the others are
 * `FRAME_STEP` times as wide, step by step, or as many times narrower. */
export const BASE_FRAME_M = 250;
/** How much wider a frame is than the one before: two steps double it. So
 * an outline is never less than `FRAME_FILL / FRAME_STEP` of its frame. */
export const FRAME_STEP = Math.SQRT2;
/** The share of the frame the outline may fill at most: room at the edges
 * for the line and the dot. */
export const FRAME_FILL = 0.8;

type Box = { minX: number; maxX: number; minY: number; maxY: number };

/** The box of `look` in its units, from its start. */
function boxFromStart(look: Look): Box {
  const [sx, sy] = look.start;
  const points = look.lines.flat();
  const xs = points.map(([x]) => x - sx);
  const ys = points.map(([, y]) => y - sy);
  return {
    minX: Math.min(0, ...xs),
    maxX: Math.max(0, ...xs),
    minY: Math.min(0, ...ys),
    maxY: Math.max(0, ...ys),
  };
}

/**
 * The frame for an outline whose box from the start is `box` units, at
 * `unitM` metres a unit, in a box of proportions `aspect` (width over
 * height). Frames come in steps, each `FRAME_STEP` times as wide as the one
 * before, to the metre; a frame is centred on the outline at the largest size it holds. So while
 * the distance changes within a step the frame stays, and the outline
 * grows from the start, which is inside it: it never leaves the frame.
 */
export function frameOf(box: Box, unitM: number, aspect: number): Frame {
  // The units across a frame that just holds the outline.
  const across =
    Math.max(box.maxX - box.minX, (box.maxY - box.minY) * aspect) / FRAME_FILL;
  const needM = across * unitM;
  const step = Math.ceil(Math.log(needM / BASE_FRAME_M) / Math.log(FRAME_STEP) - 1e-9);
  const widthM = Math.round(BASE_FRAME_M * FRAME_STEP ** step);
  // The metres of a unit of the largest outline this frame holds.
  const largestM = widthM / across;
  return {
    centre: [
      ((box.minX + box.maxX) / 2) * largestM,
      ((box.minY + box.maxY) / 2) * largestM,
    ],
    widthM,
    heightM: widthM / aspect,
  };
}

/**
 * The preview of `look` from `start`, `distanceM` long, for a box `width` ×
 * `height` points. Null with nothing to draw or nowhere to draw it.
 */
export function livePreview(
  look: Look,
  start: LatLon,
  distanceM: number,
  width: number,
  height: number,
): LivePreview | null {
  const drawn = look.lines.filter((line) => line.length > 1);
  if (drawn.length === 0 || !(look.length > 0) || !(distanceM > 0)) {
    return null;
  }
  if (!(width > 0) || !(height > 0)) {
    return null;
  }
  const unitM = distanceM / look.length;
  const box = boxFromStart({ ...look, lines: drawn });
  const frame = frameOf(box, unitM, width / height);
  const [sx, sy] = look.start;
  const metres = ([x, y]: Unit): Xy => [(x - sx) * unitM, (y - sy) * unitM];
  const perMetre = width / frame.widthM;
  const inBox = ([x, y]: Xy): Xy => [
    width / 2 + (x - frame.centre[0]) * perMetre,
    height / 2 - (y - frame.centre[1]) * perMetre,
  ];
  const [cx, cy] = frame.centre;
  const corners: [LatLon, LatLon] = [
    fromPlane(start, [cx - frame.widthM / 2, cy - frame.heightM / 2]),
    fromPlane(start, [cx + frame.widthM / 2, cy + frame.heightM / 2]),
  ];
  const middle = fromPlane(start, frame.centre);
  return {
    frame,
    corners,
    key: `${middle[0].toFixed(5)},${middle[1].toFixed(5)}:${frame.widthM}`,
    lines: drawn.map((line) => line.map((point) => fromPlane(start, metres(point)))),
    points: drawn.map((line) => line.map((point) => inBox(metres(point)))),
    dot: inBox([0, 0]),
    widthM: (box.maxX - box.minX) * unitM,
    heightM: (box.maxY - box.minY) * unitM,
  };
}

/**
 * `line`, in points, as dashes `dash` long with `gap` between them, the
 * pattern running on round its corners. Each a box `thick` high centred on
 * its piece and turned along it.
 */
export function dashesOf(
  line: readonly Xy[],
  dash: number,
  gap: number,
  thick: number,
): Dash[] {
  const dashes: Dash[] = [];
  const period = dash + gap;
  if (!(period > 0) || !(dash > 0)) {
    return dashes;
  }
  // How far along the pattern the line is at the start of a side.
  let phase = 0;
  for (let i = 1; i < line.length; i += 1) {
    const [x1, y1] = line[i - 1];
    const [x2, y2] = line[i];
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (length === 0) {
      continue;
    }
    const angle = Math.atan2(y2 - y1, x2 - x1);
    // The dashes that touch this side: from the one begun before it.
    for (let from = -phase; from < length; from += period) {
      const a = Math.max(0, from);
      const b = Math.min(length, from + dash);
      if (b <= a) {
        continue;
      }
      const mid = (a + b) / 2 / length;
      dashes.push({
        left: x1 + (x2 - x1) * mid - (b - a) / 2,
        top: y1 + (y2 - y1) * mid - thick / 2,
        length: b - a,
        angle,
      });
    }
    phase = (phase + length) % period;
  }
  return dashes;
}

/** Where a piece of the box is, in points. */
export type Place = { left: number; top: number; width: number; height: number };

/**
 * Where the frame `old` lies in a box `width` points wide that shows the
 * frame `now`, both from the same start: the place of the picture of `old`
 * while the picture of `now` is on its way. Larger than the box when `old`
 * is the wider one.
 */
export function placeIn(now: Frame, old: Frame, width: number): Place {
  const perMetre = width / now.widthM;
  const height = now.heightM * perMetre;
  const across = old.widthM * perMetre;
  const down = old.heightM * perMetre;
  return {
    left: width / 2 + (old.centre[0] - now.centre[0]) * perMetre - across / 2,
    top: height / 2 - (old.centre[1] - now.centre[1]) * perMetre - down / 2,
    width: across,
    height: down,
  };
}
