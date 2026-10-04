import {
  addSticker,
  isTap,
  MAX_STICKERS,
  moveSticker,
  POST_EMOJI,
  removeSticker,
  type Sticker,
} from "./stickers";

function added(emoji: string[]): Sticker[] {
  return emoji.reduce<Sticker[]>((stickers, e) => addSticker(stickers, e), []);
}

test("each new emoji lands on its own spot, with its own id", () => {
  const stickers = added(["🔥", "🔥", "❤️"]);
  expect(stickers.map((s) => s.emoji)).toEqual(["🔥", "🔥", "❤️"]);
  expect(new Set(stickers.map((s) => s.id)).size).toBe(3);
  expect(new Set(stickers.map((s) => `${s.x},${s.y}`)).size).toBe(3);
});

test("no more than MAX_STICKERS go on a post", () => {
  const full = added(POST_EMOJI.slice(0, MAX_STICKERS + 2));
  expect(full).toHaveLength(MAX_STICKERS);
  expect(addSticker(full, "🎉")).toEqual(full);
});

test("a spot freed by a moved emoji takes the next one", () => {
  const [first] = added(["🔥"]);
  const moved = moveSticker([first], first.id, 0.5, 0.9);
  const [, second] = addSticker(moved, "❤️");
  expect([second.x, second.y]).toEqual([first.x, first.y]);
  expect(second.id).not.toBe(first.id);
});

test("an emoji moves, but never off the post", () => {
  const stickers = added(["🔥", "❤️"]);
  const [a, b] = stickers;
  expect(moveSticker(stickers, a.id, 0.4, 0.45)[0]).toMatchObject({ x: 0.4, y: 0.45 });
  expect(moveSticker(stickers, a.id, 0.4, 0.45)[1]).toEqual(b);
  expect(moveSticker(stickers, b.id, -1, 3)[1]).toMatchObject({ x: 0.06, y: 0.94 });
});

test("an emoji taken off leaves the others", () => {
  const stickers = added(["🔥", "❤️", "💪"]);
  expect(removeSticker(stickers, stickers[1].id).map((s) => s.emoji)).toEqual([
    "🔥",
    "💪",
  ]);
});

test("a finger that hardly moved tapped", () => {
  expect(isTap(0, 0)).toBe(true);
  expect(isTap(3, 4)).toBe(true);
  expect(isTap(6, 0)).toBe(false);
  expect(isTap(20, 30)).toBe(false);
});
