import { StyleSheet, View } from "react-native";

import type { Palette } from "../../theme/tokens";

/**
 * The height over the last ten minutes (TASK-479 part B1), as bars: low
 * to high between the lowest and the highest of the span, the last bar in
 * the accent. The airspace of the pilot's file goes over it in part E.
 */

/** A span flatter than this is drawn as this tall, metres. */
const MIN_SPAN_M = 50;

export function AltitudeChart({
  series,
  width,
  height,
  palette,
}: {
  series: readonly (number | null)[];
  width: number;
  height: number;
  palette: Palette;
}) {
  const known = series.filter((value): value is number => value !== null);
  if (known.length === 0) {
    return <View style={{ width, height }} testID="altitude-chart" />;
  }
  const low = Math.min(...known);
  const high = Math.max(low + MIN_SPAN_M, Math.max(...known));
  const bar = width / series.length;
  return (
    <View style={[styles.chart, { width, height }]} testID="altitude-chart">
      {series.map((value, index) => (
        <View
          key={index}
          style={{
            width: Math.max(1, bar - 1),
            height:
              value === null ? 0 : Math.max(2, ((value - low) / (high - low)) * height),
            backgroundColor:
              index === series.length - 1 ? palette.accent : palette.borderStrong,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 1 },
});
