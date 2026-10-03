import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { color } from "../theme/tokens";
import { HEART_BOX, HEART_POINTS, heartHeight } from "./heartLine";

/**
 * The heart of the launch on its yellow, small, as a badge (TASK-221,
 * ADR-0184): next to the name «Sgrava» at the top of «Draw». The drawing
 * takes this share of the square, centred.
 */
const HEART_SHARE = 0.68;
/** The corner, as a share of the side: an app icon's, not a button's pill. */
const CORNER_SHARE = 0.22;
/** The line and the start dot, as shares of the side: thicker than the
 * launch's, so the heart still reads at the size of a word. */
const LINE_SHARE = 1 / 16;
const DOT_SHARE = 1 / 6;
const DOT_RING_SHARE = 1 / 24;

/** One straight piece of the heart, ready to be laid as a turned View. */
export type Segment = {
  left: number;
  top: number;
  width: number;
  angle: number;
};

/**
 * The heart as one straight piece per stretch of the route, for a drawing
 * `width` points wide and a line `line` thick. Nothing is drawn over time
 * here, so the long stretches stay whole: fewer Views than the launch's.
 */
export function heartSegments(width: number, line: number): Segment[] {
  const scale = width / HEART_BOX.width;
  const segments: Segment[] = [];
  for (let i = 1; i < HEART_POINTS.length; i += 1) {
    const [ax, ay] = HEART_POINTS[i - 1];
    const [bx, by] = HEART_POINTS[i];
    const length = Math.hypot(bx - ax, by - ay) * scale;
    if (length === 0) {
      continue;
    }
    // A View turns about its centre: place the centre mid-piece, and let the
    // round ends cover the joints.
    segments.push({
      left: ((ax + bx) / 2) * scale - (length + line) / 2,
      top: ((ay + by) / 2) * scale - line / 2,
      width: length + line,
      angle: (Math.atan2(by - ay, bx - ax) * 180) / Math.PI,
    });
  }
  return segments;
}

type Props = {
  /** The side of the yellow square, in points. */
  size: number;
};

/**
 * The yellow square with the heart drawn in black, as at the launch. Only a
 * picture: the screen reader hears the name next to it, not this.
 */
export function HeartBadge({ size }: Props) {
  const heartWidth = size * HEART_SHARE;
  const line = size * LINE_SHARE;
  const dot = size * DOT_SHARE;
  const segments = useMemo(() => heartSegments(heartWidth, line), [heartWidth, line]);
  const [startX, startY] = HEART_POINTS[0];
  const scale = heartWidth / HEART_BOX.width;

  return (
    <View
      style={[
        styles.square,
        { width: size, height: size, borderRadius: size * CORNER_SHARE },
      ]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      testID="heart-badge"
    >
      <View style={{ width: heartWidth, height: heartHeight(heartWidth) }}>
        {segments.map((s, i) => (
          <View
            key={i}
            style={[
              styles.line,
              {
                left: s.left,
                top: s.top,
                width: s.width,
                height: line,
                borderRadius: line / 2,
                transform: [{ rotate: `${s.angle}deg` }],
              },
            ]}
          />
        ))}
        {/* Where the route starts and ends, as at the launch. */}
        <View
          style={[
            styles.startDot,
            {
              left: startX * scale - dot / 2,
              top: startY * scale - dot / 2,
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              borderWidth: size * DOT_RING_SHARE,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  square: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.accent,
  },
  line: {
    position: "absolute",
    backgroundColor: color.onAccent,
  },
  startDot: {
    position: "absolute",
    backgroundColor: color.text,
    borderColor: color.onAccent,
  },
});
