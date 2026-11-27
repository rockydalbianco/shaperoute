import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { color, radius } from "../theme/tokens";

/** How many dots the ring is made of. */
export const DOTS = 48;
/** A dot's side, as a share of the ring's. */
const DOT_SHARE = 0.022;
/** How much bigger the last dot lit is: where the time is now. */
export const HEAD_SCALE = 1.7;

/** How many of the ring's dots are lit with `left` of `whole` still to go. */
export function litDots(left: number, whole: number): number {
  if (!(whole > 0)) {
    return 0;
  }
  return Math.max(0, Math.min(DOTS, Math.round((DOTS * left) / whole)));
}

type Props = {
  /** The ring's side, in points. */
  size: number;
  /** How many dots are lit, from the top and round clockwise. */
  lit: number;
  /** The colour of a dot lit. */
  tint: string;
  /** What stands inside the ring. */
  children?: ReactNode;
  testID?: string;
};

/**
 * The ring of the exercise's page (TASK-520 part E): 48 round dots on a
 * circle, lit from the top clockwise for the time left and going out one by
 * one, the last one lit a little bigger. Round Views and nothing else: an
 * arc would want a drawing library (ADR-0147). A decoration: the time is
 * written beside it, and a screen reader does not find the dots.
 */
export function DotRing({ size, lit, tint, children, testID }: Props) {
  const dot = Math.max(2, size * DOT_SHARE);
  const reach = size / 2 - dot * HEAD_SCALE;
  return (
    <View
      style={[styles.ring, { width: size, height: size }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      testID={testID}
    >
      {Array.from({ length: DOTS }, (_, i) => {
        const angle = (i / DOTS) * 2 * Math.PI;
        const on = i < lit;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                width: dot,
                height: dot,
                left: size / 2 + reach * Math.sin(angle) - dot / 2,
                top: size / 2 - reach * Math.cos(angle) - dot / 2,
                backgroundColor: on ? tint : color.surfaceRaised,
                transform: [{ scale: on && i === lit - 1 ? HEAD_SCALE : 1 }],
              },
            ]}
            testID={testID === undefined ? undefined : `${testID}-${on ? "on" : "off"}`}
          />
        );
      })}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    borderRadius: radius.pill,
  },
});
