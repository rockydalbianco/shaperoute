import { StyleSheet, Text, View } from "react-native";

import { color, font, space } from "../theme/tokens";

/** How tall the chart is. */
export const CHART_HEIGHT = 72;

type Props = {
  /** "+86 m", at the top. */
  gain: string;
  /** One per point of the profile, 0 the lowest and 1 the highest. */
  columns: number[];
  /** What VoiceOver says of the chart. */
  label: string;
};

/**
 * The elevation profile of a post (TASK-410 part D): the climb at the top,
 * then a thin column of `View` per point, as high as the ground there was.
 * No chart library (`react-native-svg` would need a new build).
 */
export function PostElevation({ gain, columns, label }: Props) {
  return (
    <View style={styles.box}>
      <Text style={styles.gain}>{gain}</Text>
      <View
        style={styles.chart}
        accessible
        accessibilityRole="image"
        accessibilityLabel={label}
        testID="elevation-chart"
      >
        {columns.map((height, i) => (
          <View
            // The points of a profile never move: their place is their key.
            key={i}
            style={[styles.column, { height: Math.round(height * CHART_HEIGHT) }]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: space.sm,
  },
  gain: {
    ...font.heading,
    color: color.text,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: CHART_HEIGHT,
    gap: 1,
  },
  column: {
    flex: 1,
    backgroundColor: color.textMuted,
  },
});
