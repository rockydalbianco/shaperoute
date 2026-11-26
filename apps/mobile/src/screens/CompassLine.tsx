import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { color, fontSize, fontWeight, space } from "../theme/tokens";
import type { RunNumbers } from "./RunPanel";

/**
 * The one line of numbers on «Compass» (TASK-518 A, the user's choice of
 * 2026-11-24): how far and how long, small, above the run's buttons, so
 * the map keeps the room it was given (TASK-422) and nobody has to swipe to
 * «Map» to know them. In the units of the run's numbers; one element for
 * VoiceOver.
 */
export function CompassLine({ numbers }: { numbers: RunNumbers }) {
  return (
    <View
      style={styles.line}
      accessible
      accessibilityLabel={`${t("Distance")}: ${numbers.km} ${numbers.units}, ${t("Time")}: ${numbers.time}`}
      testID="compass-line"
    >
      <Text style={styles.value}>
        {numbers.km}
        <Text style={styles.unit}>{` ${numbers.units}`}</Text>
      </Text>
      <Text style={styles.dot}>·</Text>
      <Text style={styles.value}>{numbers.time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "baseline",
    gap: space.sm,
  },
  value: {
    color: color.text,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    fontVariant: ["tabular-nums"],
  },
  unit: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.regular,
  },
  dot: {
    color: color.textMuted,
    fontSize: fontSize.heading,
  },
});
