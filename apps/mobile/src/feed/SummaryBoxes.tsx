import { StyleSheet, Text, View } from "react-native";

import { color, font, fontSize, fontWeight, space } from "../theme/tokens";
import type { PostRow } from "./postSections";

/**
 * The summary of a post in the card of «Feed» (TASK-410 part F), in a row:
 * each value over what it is, as the page of the post shows them. A screen
 * reader hears each as «Distance: 5.20 km».
 */
export function SummaryBoxes({ rows }: { rows: readonly PostRow[] }) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <View style={styles.row} testID="feed-summary">
      {rows.map((row) => (
        <View
          key={row.label}
          style={styles.box}
          accessible
          accessibilityLabel={`${row.label}: ${row.value}`}
        >
          <Text
            style={[styles.value, row.energy && styles.energy]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={MIN_VALUE_SCALE}
          >
            {row.value}
          </Text>
          <Text style={styles.label} numberOfLines={1}>
            {row.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * How small a value may get to fit its box before it is cut: never below
 * the size of its label (TASK-474).
 */
export const MIN_VALUE_SCALE = 0.8;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingBottom: space.md,
  },
  box: {
    flex: 1,
    gap: 2,
  },
  // No fixed line height (TASK-474): iOS shrinks a value that does not fit
  // its box, and a fixed line never fits a box a hair shorter than it — a
  // row of four, 39.9999 pt high — so every value went to its smallest.
  value: {
    fontSize: fontSize.body,
    color: color.text,
    fontWeight: fontWeight.semibold,
    fontVariant: ["tabular-nums"],
  },
  // The calories, in red wherever they are (TASK-424 part C3).
  energy: {
    color: color.energy,
  },
  label: {
    ...font.detail,
    color: color.textMuted,
  },
});
