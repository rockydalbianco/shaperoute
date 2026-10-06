import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Animated, Easing, Modal, StyleSheet, Text, View } from "react-native";

import { useRunControl } from "../navigation/runControl";
import { t } from "../i18n";
import { color, fontSize, fontWeight, space } from "../theme/tokens";
import { useNow } from "./RunPanel";

/** How often the countdown looks at the clock: a number never stays late. */
const LOOK_EVERY_MS = 100;

/** How long each number takes to land, and its ring to go (TASK-204). */
const POP_MS = 450;

/** The ring that leaves each number: as wide as the number is tall. */
const RING = fontSize.hero * 2.6;

/** The number the countdown shows `leftMs` before the run: 3, 2, 1. */
export function countdownNumber(leftMs: number): number {
  return Math.max(1, Math.ceil(leftMs / 1000));
}

/**
 * The countdown before a run (TASK-169): 3, 2, 1 over the whole screen, in
 * the yellow of the action it stands for. The run's clock and metres start
 * when it ends (runControl); the GPS has these seconds to find the runner.
 */
export function Countdown() {
  const { phase, startsAtMs } = useRunControl();
  const on = phase === "countdown" && startsAtMs !== null;
  const now = useNow(on, LOOK_EVERY_MS);
  const number = countdownNumber((startsAtMs ?? 0) - now);
  // 0 when a number appears, 1 when it has landed: it shrinks into place
  // while a yellow ring grows out of it and fades.
  const [pop] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!on) {
      return;
    }
    pop.setValue(0);
    Animated.timing(pop, {
      toValue: 1,
      duration: POP_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [on, number, pop]);
  return (
    <Modal
      visible={on}
      animationType="fade"
      statusBarTranslucent
      // Android's back button does not skip it.
      onRequestClose={() => {}}
    >
      <StatusBar hidden={on} />
      <View
        style={styles.screen}
        accessible
        accessibilityRole="timer"
        accessibilityLabel={t("Starting in {number}", { number })}
      >
        <View style={styles.stage}>
          <Animated.View
            style={[
              styles.ring,
              {
                opacity: pop.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }),
                transform: [
                  {
                    scale: pop.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.7, 1.2],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.Text
            style={[
              styles.number,
              {
                opacity: pop.interpolate({
                  inputRange: [0, 0.4, 1],
                  outputRange: [0, 1, 1],
                }),
                transform: [
                  {
                    scale: pop.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1.5, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {number}
          </Animated.Text>
        </View>
        <Text style={styles.hint}>{t("Get ready")}</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
    backgroundColor: color.background,
  },
  stage: {
    width: RING,
    height: RING,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: space.sm,
    borderColor: color.accent,
  },
  number: {
    color: color.accent,
    fontSize: fontSize.hero * 2,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  hint: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});
