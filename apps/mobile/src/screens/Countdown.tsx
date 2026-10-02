import { StatusBar } from "expo-status-bar";
import { Modal, StyleSheet, Text, View } from "react-native";

import { useRunControl } from "../navigation/runControl";
import { color, fontSize, fontWeight, space } from "../theme/tokens";
import { useNow } from "./RunPanel";

/** How often the countdown looks at the clock: a number never stays late. */
const LOOK_EVERY_MS = 100;

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
        accessibilityLabel={`Starting in ${number}`}
      >
        <Text style={styles.number}>{number}</Text>
        <Text style={styles.hint}>Get ready</Text>
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
  number: {
    color: color.accent,
    fontSize: fontSize.hero * 2,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  hint: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
});
