import type { LatLon } from "@shaperoute/shared-types";
import { StyleSheet, View } from "react-native";

import { color, radius, route as routeLine } from "../theme/tokens";

type Segment = { left: number; top: number; length: number; angle: number };

/**
 * The segments of `line` drawn in a box `width` × `height`, the line fitted
 * inside `pad` with north up and its proportions kept (metres east and north,
 * not degrees). No SVG in the app: each segment is a thin turned View.
 * `gaps` are the points of `line` the pen comes to without drawing: the
 * segment that ends at each is left out (a shape in pieces, TASK-226).
 */
export function thumbSegments(
  line: LatLon[],
  width: number,
  height: number,
  pad: number,
  gaps: readonly number[] = [],
): Segment[] {
  if (line.length < 2) {
    return [];
  }
  const midLat = line.reduce((sum, [lat]) => sum + lat, 0) / line.length;
  const k = Math.cos((midLat * Math.PI) / 180);
  const xs = line.map(([, lon]) => lon * k);
  const ys = line.map(([lat]) => lat);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1e-9);
  const spanY = Math.max(maxY - minY, 1e-9);
  const scale = Math.min((width - 2 * pad) / spanX, (height - 2 * pad) / spanY);
  const offX = (width - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;
  const at = (i: number): [number, number] => [
    offX + (xs[i] - minX) * scale,
    offY + (maxY - ys[i]) * scale,
  ];
  const segments: Segment[] = [];
  for (let i = 1; i < line.length; i += 1) {
    if (gaps.includes(i)) {
      continue;
    }
    const [x1, y1] = at(i - 1);
    const [x2, y2] = at(i);
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (length < 0.5) {
      continue;
    }
    segments.push({
      // A View turns about its centre: place the centre mid-segment.
      left: (x1 + x2) / 2 - length / 2,
      top: (y1 + y2) / 2,
      length,
      angle: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI,
    });
  }
  return segments;
}

type Props = { line: LatLon[]; width: number; height: number };

/** The shape of a route, small, as on a card of "Explore". */
export function RouteThumb({ line, width, height }: Props) {
  const segments = thumbSegments(line, width, height, 6);
  return (
    <View style={[styles.box, { width, height }]} accessible={false}>
      {segments.map((s, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            {
              left: s.left,
              top: s.top - 1,
              width: s.length + 1,
              transform: [{ rotate: `${s.angle}deg` }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.sm,
    backgroundColor: color.map.background,
    overflow: "hidden",
  },
  segment: {
    position: "absolute",
    height: 2,
    backgroundColor: routeLine.color,
    borderRadius: 1,
  },
});
