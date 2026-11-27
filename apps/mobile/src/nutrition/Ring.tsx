import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { springTo } from "../ui/motion";
import { useReduceMotion } from "../ui/useReduceMotion";

type Props = {
  /** The side of the square the ring is drawn in, in points. */
  size: number;
  /** How thick its line is. */
  stroke: number;
  /** 0 to 1: how far round it goes, clockwise from the top. */
  share: number;
  /** The line, and the rest of the circle under it. */
  colour: string;
  track: string;
  testID?: string;
};

/** A share is a number from 0 to 1, whatever comes in. */
export function clampShare(share: number): number {
  return Number.isFinite(share) ? Math.min(1, Math.max(0, share)) : 0;
}

/**
 * A ring that fills (TASK-489 part H): a circle's line drawn clockwise from
 * the top as far as `share`, with round ends, over the whole circle in
 * `track`. It goes to a new share on the spring `smooth`; with «Reduce
 * Motion» it is there at once.
 *
 * Drawn with plain views, as the app has no drawing library: each half of
 * the circle is a window, and behind each a half ring turns into view. The
 * right window shows the first half of the way round, the left one the
 * second. Two dots round the ends: one stays at the top, one rides the tip.
 *
 * A picture only: the numbers it shows are written beside it, so screen
 * readers pass it by.
 */
export function Ring({ size, stroke, share, colour, track, testID }: Props) {
  const still = useReduceMotion();
  const to = clampShare(share);
  const [at] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (still) {
      at.setValue(to);
      return;
    }
    const going = springTo(at, to, "smooth");
    going.start();
    return () => going.stop();
  }, [at, to, still]);

  const half = size / 2;
  const circle = {
    width: size,
    height: size,
    borderRadius: half,
    borderWidth: stroke,
  };
  const firstHalf = at.interpolate({
    inputRange: [0, 0.5],
    outputRange: ["0deg", "180deg"],
    extrapolate: "clamp",
  });
  const secondHalf = at.interpolate({
    inputRange: [0.5, 1],
    outputRange: ["0deg", "180deg"],
    extrapolate: "clamp",
  });
  const tip = at.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
    extrapolate: "clamp",
  });
  // Nothing of the ring shows at zero, not even its round end.
  const ends = at.interpolate({
    inputRange: [0, 0.005],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const dot = {
    position: "absolute" as const,
    top: 0,
    left: half - stroke / 2,
    width: stroke,
    height: stroke,
    borderRadius: stroke / 2,
    backgroundColor: colour,
  };

  return (
    <View
      style={{ width: size, height: size }}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      testID={testID}
    >
      <View style={[styles.layer, circle, { borderColor: track }]} />
      <View style={[styles.window, { left: half, width: half, height: size }]}>
        <Animated.View
          style={[
            styles.window,
            {
              left: -half,
              width: half,
              height: size,
              transformOrigin: "right center",
              transform: [{ rotate: firstHalf }],
            },
          ]}
        >
          <View style={[styles.layer, circle, { borderColor: colour }]} />
        </Animated.View>
      </View>
      <View style={[styles.window, { left: 0, width: half, height: size }]}>
        <Animated.View
          style={[
            styles.window,
            {
              left: half,
              width: half,
              height: size,
              transformOrigin: "left center",
              transform: [{ rotate: secondHalf }],
            },
          ]}
        >
          <View style={[styles.layer, circle, { left: -half, borderColor: colour }]} />
        </Animated.View>
      </View>
      <Animated.View style={[dot, { opacity: ends }]} />
      <Animated.View
        style={[
          styles.layer,
          { width: size, height: size, opacity: ends, transform: [{ rotate: tip }] },
        ]}
      >
        <View style={dot} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  window: {
    position: "absolute",
    top: 0,
    overflow: "hidden",
  },
});
