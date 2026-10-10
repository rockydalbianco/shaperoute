import type { Box } from "./tourParts";

/** Room around a part shown, inside the light. */
export const HOLE_PAD = 6;
/** Between the light and the words. */
export const BUBBLE_GAP = 12;
/** Between the words and the edges of the screen. */
export const EDGE = 16;

export type Screen = { width: number; height: number };
export type Insets = { top: number; bottom: number };

/** Where the light and the words of a step go. */
export type Placed = {
  /** The part shown, a little larger; null: the words alone. */
  hole: Box | null;
  /** The top of the words. */
  bubbleTop: number;
};

/** The part's box with room around it, kept inside the screen. */
export function holeOf(part: Box, screen: Screen): Box {
  const left = Math.max(0, part.x - HOLE_PAD);
  const top = Math.max(0, part.y - HOLE_PAD);
  const right = Math.min(screen.width, part.x + part.width + HOLE_PAD);
  const bottom = Math.min(screen.height, part.y + part.height + HOLE_PAD);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * Where the words of a step go (TASK-266): under the part shown when they
 * fit there, else over it; when neither fits, as for a whole page, at the
 * foot of the screen, with the light cut above them. Without a part, in
 * the middle. `bubble` is the height of the words, once laid out.
 */
export function placeBubble(
  part: Box | null,
  screen: Screen,
  insets: Insets,
  bubble: number,
): Placed {
  const highest = insets.top + EDGE;
  const lowest = screen.height - insets.bottom - EDGE - bubble;
  if (part === null) {
    return { hole: null, bubbleTop: Math.max(highest, (screen.height - bubble) / 2) };
  }
  const hole = holeOf(part, screen);
  const under = hole.y + hole.height + BUBBLE_GAP;
  if (under <= lowest) {
    return { hole, bubbleTop: under };
  }
  const over = hole.y - BUBBLE_GAP - bubble;
  if (over >= highest) {
    return { hole, bubbleTop: over };
  }
  const bubbleTop = Math.max(highest, lowest);
  const cut = Math.max(0, Math.min(hole.height, bubbleTop - BUBBLE_GAP - hole.y));
  return { hole: { ...hole, height: cut }, bubbleTop };
}

/** The four dark boxes around the light: above, under, left and right. */
export function shadeAround(hole: Box | null, screen: Screen): Box[] {
  if (hole === null) {
    return [{ x: 0, y: 0, width: screen.width, height: screen.height }];
  }
  const bottom = hole.y + hole.height;
  const right = hole.x + hole.width;
  const boxes: Box[] = [
    { x: 0, y: 0, width: screen.width, height: hole.y },
    { x: 0, y: bottom, width: screen.width, height: screen.height - bottom },
    { x: 0, y: hole.y, width: hole.x, height: hole.height },
    { x: right, y: hole.y, width: screen.width - right, height: hole.height },
  ];
  return boxes.filter((box) => box.width > 0 && box.height > 0);
}
