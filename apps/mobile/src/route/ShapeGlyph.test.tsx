import { type OutlinePoint, SHAPES } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { lookOf } from "../mapdraw/figure";
import { color } from "../theme/tokens";
import {
  GLYPH_LINE,
  GLYPH_SIZE,
  GLYPH_TOLERANCE,
  glyphLines,
  ShapeGlyph,
  thinned,
} from "./ShapeGlyph";

// The sign of a shape on its tile (TASK-444): its real outline, the
// catalogue's, as a thin line — not an emoji.

/** How far `point` is from the line through `points`. */
function awayFromLine(point: OutlinePoint, points: OutlinePoint[]): number {
  let least = Infinity;
  for (let i = 1; i < points.length; i += 1) {
    const [a, b] = [points[i - 1], points[i]];
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const length2 = dx * dx + dy * dy;
    const along =
      length2 === 0
        ? 0
        : Math.max(
            0,
            Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / length2),
          );
    least = Math.min(
      least,
      Math.hypot(point[0] - a[0] - along * dx, point[1] - a[1] - along * dy),
    );
  }
  return least;
}

/** The catalogue's lines of `shape` in the sign's box, nothing left out. */
function fullLines(shape: (typeof SHAPES)[number]): OutlinePoint[][] {
  const { lines } = lookOf({ kind: "shape", shape }, true);
  const points = lines.flat();
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  const side = Math.max(maxX - minX, maxY - minY);
  const left = minX - (side - (maxX - minX)) / 2;
  const top = maxY + (side - (maxY - minY)) / 2;
  return lines.map((line) =>
    line.map(([x, y]): OutlinePoint => [(x - left) / side, (top - y) / side]),
  );
}

test("thinning keeps the ends and only points of the line, in their order", () => {
  const line: OutlinePoint[] = [
    [0, 0],
    [0.25, 0.001],
    [0.5, 0],
    [0.75, 0.4],
    [1, 0],
  ];
  expect(thinned(line, 0.01)).toEqual([
    [0, 0],
    [0.5, 0],
    [0.75, 0.4],
    [1, 0],
  ]);
  // Nothing to leave out of two points; a tolerance of nothing keeps a bend.
  expect(thinned(line.slice(0, 2), 1)).toEqual(line.slice(0, 2));
  expect(thinned(line, 0)).toEqual(line);
});

test("a closed line stays closed and is not thinned to a point", () => {
  const square: OutlinePoint[] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
    [0, 0],
  ];
  expect(thinned(square, 0.01)).toEqual(square);
});

test("every shape's sign is the catalogue's own figure, inside the tolerance", () => {
  for (const shape of SHAPES) {
    const full = fullLines(shape);
    const sign = glyphLines(shape);
    expect(sign).toHaveLength(full.length);
    sign.forEach((line, at) => {
      // The ends stay, every point kept is a point of the catalogue…
      expect(line[0]).toEqual(full[at][0]);
      expect(line[line.length - 1]).toEqual(full[at][full[at].length - 1]);
      for (const point of line) {
        expect(full[at]).toContainEqual(point);
        expect(point[0]).toBeGreaterThanOrEqual(0);
        expect(point[0]).toBeLessThanOrEqual(1);
        expect(point[1]).toBeGreaterThanOrEqual(0);
        expect(point[1]).toBeLessThanOrEqual(1);
      }
      // …and none left out is farther than the tolerance from the line.
      for (const point of full[at]) {
        expect(awayFromLine(point, line)).toBeLessThanOrEqual(GLYPH_TOLERANCE + 1e-9);
      }
    });
  }
});

test("the signs are worked out once, and a tile's worth of sides", () => {
  expect(glyphLines("horse")).toBe(glyphLines("horse"));
  const sides = SHAPES.reduce(
    (total, shape) =>
      total + glyphLines(shape).reduce((sum, line) => sum + line.length - 1, 0),
    0,
  );
  const whole = SHAPES.reduce(
    (total, shape) =>
      total + fullLines(shape).reduce((sum, line) => sum + line.length - 1, 0),
    0,
  );
  // Thinner than the catalogue, and no more than a grid of them can carry.
  expect(sides).toBeLessThan(whole);
  expect(sides / SHAPES.length).toBeLessThan(60);
});

test("a sign is a line in the text's colour, inside its square, not read aloud", async () => {
  await render(<ShapeGlyph shape="cat" />);
  const sign = screen.getByTestId("shape-glyph-cat", { includeHiddenElements: true });
  expect(sign).toHaveStyle({ width: GLYPH_SIZE, height: GLYPH_SIZE });
  expect(sign).toHaveProp("accessibilityElementsHidden", true);
  expect(sign).toHaveProp("importantForAccessibility", "no-hide-descendants");
  const sides = sign.children.flatMap((child) =>
    typeof child === "string" ? [] : [child],
  );
  expect(sides).toHaveLength(
    glyphLines("cat").reduce((sum, line) => sum + line.length - 1, 0),
  );
  for (const side of sides) {
    const style = StyleSheet.flatten(side.props.style) as {
      backgroundColor: string;
      height: number;
      left: number;
      top: number;
      width: number;
    };
    expect(style.backgroundColor).toBe(color.text);
    expect(style.height).toBe(GLYPH_LINE);
    // A side's middle is inside the square, half a line from its edge.
    const [x, y] = [style.left + style.width / 2, style.top + GLYPH_LINE / 2];
    expect(x).toBeGreaterThanOrEqual(GLYPH_LINE / 2 - 1e-9);
    expect(x).toBeLessThanOrEqual(GLYPH_SIZE - GLYPH_LINE / 2 + 1e-9);
    expect(y).toBeGreaterThanOrEqual(GLYPH_LINE / 2 - 1e-9);
    expect(y).toBeLessThanOrEqual(GLYPH_SIZE - GLYPH_LINE / 2 + 1e-9);
  }
});

test("its size and its colour can be given", async () => {
  await render(<ShapeGlyph shape="star" size={28} tint={color.textMuted} />);
  const sign = screen.getByTestId("shape-glyph-star", { includeHiddenElements: true });
  expect(sign).toHaveStyle({ width: 28, height: 28 });
  const [side] = sign.children;
  expect(side).toHaveStyle({ backgroundColor: color.textMuted });
});
