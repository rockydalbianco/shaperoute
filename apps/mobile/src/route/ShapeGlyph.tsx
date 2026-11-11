import type { OutlinePoint, Shape } from "@shaperoute/shared-types";
import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { lookOf } from "../mapdraw/figure";
import { color } from "../theme/tokens";
import { segmentsOf } from "./ImagePreview";

/** The side of a shape's sign on its tile, in points. */
export const GLYPH_SIZE = 32;
/** Its line, as thick as an icon's of the bar at this size. */
export const GLYPH_LINE = 2;
/**
 * How far a point left out may be from the line kept, as a share of the
 * sign's side: a fifth of a point on a tile, not seen. It takes a third of
 * the sides away, and every side is a View.
 */
export const GLYPH_TOLERANCE = 0.006;

function awayFrom(point: OutlinePoint, a: OutlinePoint, b: OutlinePoint): number {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const length2 = dx * dx + dy * dy;
  if (length2 === 0) {
    // A closed line: its ends are one point.
    return Math.hypot(point[0] - a[0], point[1] - a[1]);
  }
  const along = Math.max(
    0,
    Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / length2),
  );
  return Math.hypot(point[0] - a[0] - along * dx, point[1] - a[1] - along * dy);
}

/**
 * `points` with the ones a small drawing does not need left out
 * (Douglas–Peucker): the first and the last stay, and no point left out is
 * farther than `tolerance` from the line kept. Points of the line itself,
 * in their order: nothing is moved, nothing is made up.
 */
export function thinned(
  points: readonly OutlinePoint[],
  tolerance: number,
): OutlinePoint[] {
  if (points.length <= 2) {
    return [...points];
  }
  const last = points.length - 1;
  let far = 0;
  let at = 0;
  for (let i = 1; i < last; i += 1) {
    const away = awayFrom(points[i], points[0], points[last]);
    if (away > far) {
      far = away;
      at = i;
    }
  }
  if (far <= tolerance) {
    return [points[0], points[last]];
  }
  return [
    ...thinned(points.slice(0, at + 1), tolerance).slice(0, -1),
    ...thinned(points.slice(at), tolerance),
  ];
}

const kept = new Map<Shape, OutlinePoint[][]>();

/**
 * The lines of a shape's sign, as shares of a square box, y down, centred:
 * the engine's own figure (`catalogueShapes.json`, as the preview of «Draw»
 * and «Draw on the map» have it), drawn with the pen up where the catalogue
 * has it so — a face's eyes are eyes, with no line running to them — and
 * thinned for a tile. Worked out once for each shape.
 */
export function glyphLines(shape: Shape): OutlinePoint[][] {
  const known = kept.get(shape);
  if (known !== undefined) {
    return known;
  }
  const { lines } = lookOf({ kind: "shape", shape }, true);
  const points = lines.flat();
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  const side = Math.max(maxX - minX, maxY - minY);
  // Centred in the square; y turned, the plane's north up (as `shapeScale`).
  const left = minX - (side - (maxX - minX)) / 2;
  const top = maxY + (side - (maxY - minY)) / 2;
  const made = lines.map((line) =>
    thinned(
      line.map(([x, y]): OutlinePoint => [(x - left) / side, (top - y) / side]),
      GLYPH_TOLERANCE,
    ),
  );
  kept.set(shape, made);
  return made;
}

type Props = {
  shape: Shape;
  /** The side of the square it is drawn in, in points. */
  size?: number;
  /** The line's colour: a token. */
  tint?: string;
};

/**
 * The sign of a shape of the catalogue (TASK-444): its real outline as a
 * thin line, in place of an emoji — a horse was a picture in colours beside
 * a white circle. No SVG, the app has no library for it: each side is a
 * thin box turned along it, as `OutlineLines` draws the preview. Hidden
 * from a screen reader: the tile around it says the shape's name.
 */
export const ShapeGlyph = memo(function ShapeGlyph({
  shape,
  size = GLYPH_SIZE,
  tint = color.text,
}: Props) {
  // The line's half stays inside the square on every side.
  const inner = size - GLYPH_LINE;
  return (
    <View
      style={{ width: size, height: size }}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={`shape-glyph-${shape}`}
    >
      {glyphLines(shape).flatMap((line, at) =>
        segmentsOf(line, inner, inner, GLYPH_LINE).map((segment, index) => (
          <View
            key={`${at}-${index}`}
            style={[
              styles.side,
              {
                backgroundColor: tint,
                left: segment.left + GLYPH_LINE / 2,
                top: segment.top + GLYPH_LINE / 2,
                width: segment.length,
                transform: [{ rotate: `${segment.angle}rad` }],
              },
            ]}
          />
        )),
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  side: {
    position: "absolute",
    height: GLYPH_LINE,
    borderRadius: GLYPH_LINE / 2,
  },
});
