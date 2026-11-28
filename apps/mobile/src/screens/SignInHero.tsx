import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { ShapeOutline } from "../game/ShapeOutline";
import { color, radius, space } from "../theme/tokens";
import { HEART } from "../ui/outlines";
import { tintOver } from "../ui/tint";
import { useReduceMotion } from "../ui/useReduceMotion";

/** How long the pen takes to go round the heart, once. */
export const SIGN_IN_DRAW_MS = 1600;
/** The side of the heart and how tall the card is, in points. */
export const SIGN_IN_HEART = 64;
const HERO_HEIGHT = 104;
/** How much darker than the card its halo is. */
const HALO_SHARE = 0.08;

type Props = {
  testID?: string;
};

/**
 * The card over «Sign up» and «Log in» (TASK-523 part B, ADR-0417): the
 * app's yellow, whole, and on it the heart that is its logo, drawn once by
 * the pen as a run draws it, in the dark of words on yellow. The yellow is
 * the app's own here as on the logo and on the form's button (ADR-0409),
 * not a section's. A flat halo behind the heart, a little darker; no
 * gradient, the app has no drawing library. With «Reduce Motion» the heart
 * is whole at once. Low, so that with it «Sign up» keeps its button on the
 * screen of a phone (seen in the simulator).
 *
 * A picture only: the header over it has the app's name, and screen readers
 * pass it by.
 */
export function SignInHero({ testID }: Props) {
  const still = useReduceMotion();
  const [drawn] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (still) {
      drawn.setValue(1);
      return undefined;
    }
    const drawing = Animated.timing(drawn, {
      toValue: 1,
      duration: SIGN_IN_DRAW_MS,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    drawing.start();
    return () => drawing.stop();
  }, [drawn, still]);
  return (
    <View
      style={styles.card}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      testID={testID}
    >
      <View
        style={styles.halo}
        testID={testID === undefined ? undefined : `${testID}-halo`}
      />
      <ShapeOutline
        outline={HEART}
        size={SIGN_IN_HEART}
        color={color.onAccent}
        thickness={3}
        draw={drawn}
        testID={testID === undefined ? undefined : `${testID}-heart`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: HERO_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: space.xl,
    borderRadius: radius.card,
    backgroundColor: color.accent,
  },
  halo: {
    position: "absolute",
    width: 1.6 * HERO_HEIGHT,
    aspectRatio: 1,
    borderRadius: radius.pill,
    backgroundColor: tintOver(color.onAccent, color.accent, HALO_SHARE),
  },
});
