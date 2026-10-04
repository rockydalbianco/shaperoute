/**
 * The emoji on a post (TASK-231): picked from a row under it, laid over
 * the picture, dragged where the runner wants them. Their place is a share
 * of the post's width and height, so the picture made from it has them in
 * the same place whatever its size.
 */

/** The emoji under the post, in this order. */
export const POST_EMOJI: readonly string[] = [
  "🔥",
  "❤️",
  "💪",
  "🏃",
  "🎉",
  "😅",
  "🥵",
  "😎",
  "⚡",
  "🏆",
  "☀️",
  "🌧️",
];

/** More would cover the drawing. */
export const MAX_STICKERS = 5;

export type Sticker = {
  /** Its own, so two of the same emoji move apart. */
  id: number;
  emoji: string;
  /** The centre, as shares of the post's width and height, from its top left. */
  x: number;
  y: number;
};

/**
 * Where a new emoji lands, in this order: around the drawing, away from the
 * title at the top and the numbers at the foot.
 */
const SPOTS: readonly [number, number][] = [
  [0.8, 0.24],
  [0.2, 0.5],
  [0.8, 0.56],
  [0.2, 0.26],
  [0.5, 0.62],
];

/** How close to the edge a centre can go: an emoji stays on the post. */
const EDGE = 0.06;

function clamp(value: number): number {
  return Math.min(1 - EDGE, Math.max(EDGE, value));
}

/** The emoji with `emoji` added at the first free spot; the same list once
 * there are MAX_STICKERS. */
export function addSticker(stickers: readonly Sticker[], emoji: string): Sticker[] {
  if (stickers.length >= MAX_STICKERS) {
    return [...stickers];
  }
  const taken = (spot: readonly [number, number]) =>
    stickers.some((s) => Math.hypot(s.x - spot[0], s.y - spot[1]) < 0.05);
  const [x, y] = SPOTS.find((spot) => !taken(spot)) ?? SPOTS[0];
  const id = stickers.reduce((most, s) => Math.max(most, s.id), 0) + 1;
  return [...stickers, { id, emoji, x, y }];
}

/** The emoji with `id` at its new place, kept on the post. */
export function moveSticker(
  stickers: readonly Sticker[],
  id: number,
  x: number,
  y: number,
): Sticker[] {
  return stickers.map((s) => (s.id === id ? { ...s, x: clamp(x), y: clamp(y) } : s));
}

export function removeSticker(stickers: readonly Sticker[], id: number): Sticker[] {
  return stickers.filter((s) => s.id !== id);
}

/** A finger that moved less than this, in points, tapped: the emoji goes. */
export const TAP_SLOP = 6;

export function isTap(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) < TAP_SLOP;
}
