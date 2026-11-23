import { StyleSheet, View } from "react-native";

import type { Palette } from "../../theme/tokens";
import type { ProfileBand } from "../airspaceProfile";

/**
 * The height over the last ten minutes (TASK-479 part B1), as bars: low
 * to high between the lowest and the highest of the span, the last bar in
 * the accent.
 *
 * Behind the bars, the volumes of the pilot's file that held the pilot in
 * each bar (part E3), floor to ceiling, as bands: error colour for P, R
 * and Q, warning colour for the rest. The span reaches out to a floor or
 * ceiling within BAND_REACH_M of it, so a limit just over or under the
 * pilot shows; one further off is cut at the edge.
 */

/** A span flatter than this is drawn as this tall, metres. */
const MIN_SPAN_M = 50;
/** A band's limit this close to the span widens the span to it, metres. */
export const BAND_REACH_M = 300;
const BAND_OPACITY = 0.3;

/** The span the chart draws: the heights, and the band limits near them. */
export function chartSpan(
  known: readonly number[],
  bands: readonly ProfileBand[][],
): { low: number; high: number } {
  let low = Math.min(...known);
  let high = Math.max(...known);
  for (const bar of bands) {
    for (const band of bar) {
      for (const limit of [band.floorM, band.ceilingM]) {
        if (Number.isFinite(limit) && limit >= low - BAND_REACH_M && limit < low) {
          low = limit;
        }
        if (Number.isFinite(limit) && limit <= high + BAND_REACH_M && limit > high) {
          high = limit;
        }
      }
    }
  }
  return { low, high: Math.max(low + MIN_SPAN_M, high) };
}

export function AltitudeChart({
  series,
  width,
  height,
  palette,
  bands = [],
}: {
  series: readonly (number | null)[];
  width: number;
  height: number;
  palette: Palette;
  bands?: readonly ProfileBand[][];
}) {
  const known = series.filter((value): value is number => value !== null);
  if (known.length === 0) {
    return <View style={{ width, height }} testID="altitude-chart" />;
  }
  const { low, high } = chartSpan(known, bands);
  const y = (metres: number) =>
    Math.max(0, Math.min(height, ((metres - low) / (high - low)) * height));
  const bar = width / series.length;
  return (
    <View style={[styles.chart, { width, height }]} testID="altitude-chart">
      {series.map((value, index) => (
        <View
          key={index}
          style={[styles.column, { width: Math.max(1, bar - 1), height }]}
        >
          {(bands[index] ?? []).map((band, layer) => {
            const bottom = y(band.floorM);
            const top = y(band.ceilingM);
            return top - bottom < 1 ? null : (
              <View
                key={layer}
                testID="altitude-chart-band"
                style={[
                  styles.band,
                  {
                    bottom,
                    height: top - bottom,
                    backgroundColor: band.danger ? palette.error : palette.warning,
                  },
                ]}
              />
            );
          })}
          <View
            style={{
              height:
                value === null
                  ? 0
                  : Math.max(2, ((value - low) / (high - low)) * height),
              backgroundColor:
                index === series.length - 1 ? palette.accent : palette.borderStrong,
            }}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 1 },
  column: { justifyContent: "flex-end" },
  band: { position: "absolute", left: 0, right: 0, opacity: BAND_OPACITY },
});
