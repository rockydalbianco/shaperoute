import { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  type LayoutChangeEvent,
  StyleSheet,
  View,
} from "react-native";

import { color } from "../theme/tokens";
import { useReduceMotion } from "../ui/useReduceMotion";
import { COUNT_MS } from "./CountUp";

/** A point of the line: 0 to 1 across, 0 to 1 up. */
export type ChartPoint = { x: number; y: number };

/** The points of `values` taken at `at` (days, or any growing number):
 * spread across the width by when, and up by how much, with the lowest at
 * the bottom and the highest at the top. One value sits in the middle. */
export function chartPoints(
  values: readonly { at: number; value: number }[],
): ChartPoint[] {
  if (values.length === 0) {
    return [];
  }
  const ats = values.map((item) => item.at);
  const vs = values.map((item) => item.value);
  const first = Math.min(...ats);
  const span = Math.max(...ats) - first;
  const low = Math.min(...vs);
  const high = Math.max(...vs);
  return values.map(({ at, value }) => ({
    x: span === 0 ? 0.5 : (at - first) / span,
    y: high === low ? 0.5 : (value - low) / (high - low),
  }));
}

export type Segment = { left: number; top: number; length: number; angle: number };

/** The view that draws the line from `a` to `b` in a box of `width` ×
 * `height` points: a bar `stroke` thick, centred between the two and
 * turned by `angle` radians. */
export function segmentOf(
  a: ChartPoint,
  b: ChartPoint,
  width: number,
  height: number,
  stroke: number,
): Segment {
  const x1 = a.x * width;
  const y1 = (1 - a.y) * height;
  const x2 = b.x * width;
  const y2 = (1 - b.y) * height;
  const length = Math.hypot(x2 - x1, y2 - y1);
  return {
    left: (x1 + x2) / 2 - length / 2,
    top: (y1 + y2) / 2 - stroke / 2,
    length,
    angle: Math.atan2(y2 - y1, x2 - x1),
  };
}

type Props = {
  points: readonly ChartPoint[];
  height: number;
  /** How thick the line is. */
  stroke?: number;
  /** A dot on each point. */
  dots?: boolean;
  colour?: string;
  testID?: string;
};

/**
 * The line of the weight (TASK-489 part K1): drawn with plain views, as the
 * app has no drawing library (like the rings of part H). Each piece of the
 * line is a thin bar turned to join two points; the pieces come one after
 * the other, so the line draws itself from the left. With «Reduce Motion»
 * it is there at once.
 *
 * A picture only: the numbers are written beside it, so screen readers
 * pass it by.
 */
export function WeightChart({
  points,
  height,
  stroke = 3,
  dots = false,
  colour = color.text,
  testID,
}: Props) {
  const still = useReduceMotion();
  const [width, setWidth] = useState(0);
  const [drawn] = useState(() => new Animated.Value(0));
  const pieces = Math.max(0, points.length - 1);
  // The line draws again only when it changes, not at every render.
  const shape = points.map((point) => `${point.x},${point.y}`).join(";");

  useEffect(() => {
    if (still || pieces === 0) {
      drawn.setValue(pieces);
      return;
    }
    drawn.setValue(0);
    const draw = Animated.timing(drawn, {
      toValue: pieces,
      duration: COUNT_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    draw.start();
    return () => draw.stop();
  }, [drawn, pieces, still, shape]);

  function measure(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  const dot = stroke * 2.4;
  return (
    <View
      style={[styles.box, { height }]}
      onLayout={measure}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      testID={testID}
    >
      {width > 0 &&
        points.slice(1).map((point, index) => {
          const piece = segmentOf(points[index], point, width, height, stroke);
          return (
            <Animated.View
              key={`line-${index}`}
              style={[
                styles.piece,
                {
                  left: piece.left,
                  top: piece.top,
                  width: piece.length,
                  height: stroke,
                  borderRadius: stroke / 2,
                  backgroundColor: colour,
                  opacity: drawn.interpolate({
                    inputRange: [index, index + 1],
                    outputRange: [0, 1],
                    extrapolate: "clamp",
                  }),
                  transform: [{ rotate: `${piece.angle}rad` }],
                },
              ]}
              testID={testID === undefined ? undefined : `${testID}-piece`}
            />
          );
        })}
      {width > 0 &&
        dots &&
        points.map((point, index) => (
          <View
            key={`dot-${index}`}
            style={[
              styles.dot,
              {
                left: point.x * width - dot / 2,
                top: (1 - point.y) * height - dot / 2,
                width: dot,
                height: dot,
                borderRadius: dot / 2,
                borderColor: colour,
              },
            ]}
            testID={testID === undefined ? undefined : `${testID}-dot`}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignSelf: "stretch",
  },
  piece: {
    position: "absolute",
  },
  dot: {
    position: "absolute",
    borderWidth: 2,
    backgroundColor: color.surface,
  },
});
