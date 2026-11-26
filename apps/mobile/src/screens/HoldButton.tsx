import { useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { color, fontSize, fontWeight, radius, space } from "../theme/tokens";

/** How long «Stop» is held to end the run, in milliseconds: long enough
 * that a hand brushing the screen while running does not end it. */
export const HOLD_STOP_MS = 1000;

/** The round buttons of the run: as wide as a thumb, and then some. */
export const ROUND_BUTTON = 72;

/**
 * «Stop», to hold (TASK-169): a tap does nothing but say so, a hold of
 * HOLD_STOP_MS ends the run. The button fills while it is held.
 */
export function HoldButton({ onHeld }: { onHeld: () => void }) {
  const [fill] = useState(() => new Animated.Value(0));
  const [tapped, setTapped] = useState(false);

  function hold() {
    Animated.timing(fill, {
      toValue: 1,
      duration: HOLD_STOP_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }

  function release() {
    fill.stopAnimation();
    fill.setValue(0);
  }

  return (
    <View style={styles.box}>
      <Pressable
        style={styles.button}
        delayLongPress={HOLD_STOP_MS}
        onPressIn={hold}
        onPressOut={release}
        onPress={() => setTapped(true)}
        onLongPress={() => {
          release();
          onHeld();
        }}
        accessibilityRole="button"
        accessibilityLabel={t("Stop")}
        accessibilityHint={t("Hold to end the run")}
      >
        <Animated.View
          testID="stop-fill"
          style={[styles.fill, { transform: [{ scale: fill }] }]}
        />
        <View style={styles.square} />
      </Pressable>
      <Text style={styles.label} numberOfLines={2} adjustsFontSizeToFit>
        {tapped ? t("Hold to stop") : t("Stop")}
      </Text>
    </View>
  );
}

/** The words under «Stop»: as wide as the button and a little more, two
 * lines kept for them, so «Hold to stop» moves nothing around it
 * (TASK-511). */
const LABEL_WIDTH = ROUND_BUTTON + 2 * space.lg;
const LABEL_LINE = Math.round(fontSize.small * 1.3);

const styles = StyleSheet.create({
  box: {
    width: LABEL_WIDTH,
    alignItems: "center",
    gap: space.xs,
  },
  button: {
    width: ROUND_BUTTON,
    height: ROUND_BUTTON,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  // What ends a run is not yellow: that is the route's (ADR-0046).
  fill: {
    position: "absolute",
    width: ROUND_BUTTON,
    height: ROUND_BUTTON,
    borderRadius: radius.pill,
    backgroundColor: color.warning,
  },
  square: {
    width: space.xl,
    height: space.xl,
    borderRadius: space.xs,
    backgroundColor: color.text,
  },
  label: {
    width: LABEL_WIDTH,
    height: 2 * LABEL_LINE,
    color: color.textMuted,
    fontSize: fontSize.small,
    lineHeight: LABEL_LINE,
    fontWeight: fontWeight.semibold,
    textAlign: "center",
  },
});
