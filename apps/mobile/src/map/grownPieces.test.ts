import type { LatLon } from "@shaperoute/shared-types";

import { grownPieces } from "./grownPieces";

const p = (n: number): LatLon => [46 + n / 1000, 11];
const line = (from: number, to: number): LatLon[] =>
  Array.from({ length: to - from + 1 }, (_, i) => p(from + i));

test("nothing new is the same", () => {
  const pieces = [[line(0, 5)], [line(5, 9)]];
  expect(grownPieces(pieces, [[line(0, 5)], [line(5, 9)]])).toBe("same");
});

test("the last line of a group grown gives the points it gained", () => {
  // Skied 0-5, a lift 5-9, skied again 9-12, now 9-15.
  const told = [[line(0, 5), line(9, 12)], [line(5, 9)]];
  const now = [[line(0, 5), line(9, 15)], [line(5, 9)]];
  expect(grownPieces(told, now)).toEqual({ group: 0, added: [p(13), p(14), p(15)] });
});

test("a lift growing while ridden is its group's last line", () => {
  const told = [[line(0, 5)], [line(5, 8)]];
  const now = [[line(0, 5)], [line(5, 10)]];
  expect(grownPieces(told, now)).toEqual({ group: 1, added: [p(9), p(10)] });
});

test("a piece found, or one cut differently, is told whole", () => {
  // A lift found inside what was skied: one more line in each group.
  expect(
    grownPieces([[line(0, 12)], []], [[line(0, 5), line(9, 12)], [line(5, 9)]]),
  ).toBe("other");
  // The same count of lines, but an earlier one changed.
  expect(
    grownPieces(
      [[line(0, 5), line(9, 12)], [line(5, 9)]],
      [[line(0, 6), line(9, 12)], [line(6, 9)]],
    ),
  ).toBe("other");
});

test("a line that is not the last of its group may not grow", () => {
  const told = [[line(0, 5), line(9, 12)], []];
  const now = [[line(0, 6), line(9, 12)], []];
  expect(grownPieces(told, now)).toBe("other");
});

test("two lines grown at once are told whole", () => {
  const told = [[line(0, 5)], [line(5, 8)]];
  const now = [[line(0, 6)], [line(5, 9)]];
  expect(grownPieces(told, now)).toBe("other");
});

test("a shorter line, or another start, is told whole", () => {
  expect(grownPieces([[line(0, 5)]], [[line(0, 4)]])).toBe("other");
  expect(grownPieces([[line(0, 5)]], [[line(1, 7)]])).toBe("other");
  expect(grownPieces([[line(0, 5)], []], [[line(0, 5)]])).toBe("other");
});
