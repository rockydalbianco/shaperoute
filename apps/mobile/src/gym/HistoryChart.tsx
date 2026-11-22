import type { GymHistoryMeasure, GymHistoryPoint } from "@shaperoute/shared-types";
import { useState } from "react";
import { type LayoutChangeEvent, StyleSheet, Text, View } from "react-native";

import { MONTHS } from "../activities/activityText";
import { t } from "../i18n";
import { segmentsOf } from "../route/ImagePreview";
import { color, font, space } from "../theme/tokens";
import type { Units } from "../units/units";
import { measureLabel } from "./exerciseHistory";

/** How tall the chart is, in points. */
export const HISTORY_CHART_HEIGHT = 160;
/** The line's width, and the dots of the workouts and of the records. */
const LINE = 2;
const DOT = 8;
const RECORD_DOT = 12;
/** Room around the line so a dot on the edge shows whole. */
const PAD = RECORD_DOT / 2;

/** «2 Nov»: the day of a point, on the phone's clock. */
export function shortDay(startedAt: string): string {
  const when = new Date(startedAt);
  return t("{day} {month}", {
    day: String(when.getDate()),
    month: t(MONTHS[when.getMonth()]),
  });
}

/** Where each point goes, as shares of the box (x by time, y up). */
export function placesOf(points: readonly GymHistoryPoint[]): [number, number][] {
  if (points.length === 0) {
    return [];
  }
  const times = points.map((point) => new Date(point.started_at).getTime());
  const values = points.map((point) => point.value);
  const [first, last] = [Math.min(...times), Math.max(...times)];
  let [low, high] = [Math.min(...values), Math.max(...values)];
  if (high === low) {
    // One value: the line in the middle.
    [low, high] = [low - 1, high + 1];
  }
  return points.map((point, i) => [
    last === first ? 0.5 : (times[i] - first) / (last - first),
    1 - (point.value - low) / (high - low),
  ]);
}

/**
 * The chart of «History» (TASK-483 part B): one dot a workout, joined by a
 * line, the records bigger; the highest and the lowest value at the side,
 * the first and the last day under it. Drawn with `View`s, as the
 * elevation of a post: the app has no chart library.
 */
export function HistoryChart({
  points,
  measure,
  units,
}: {
  points: readonly GymHistoryPoint[];
  measure: GymHistoryMeasure;
  units: Units;
}) {
  const [width, setWidth] = useState(0);
  if (points.length === 0) {
    return (
      <View style={[styles.empty]} testID="history-chart-empty">
        <Text style={styles.muted}>{t("No workouts in this period.")}</Text>
      </View>
    );
  }
  const values = points.map((point) => point.value);
  const high = measureLabel(measure, Math.max(...values), units);
  const low = measureLabel(measure, Math.min(...values), units);
  const inner = Math.max(0, width - 2 * PAD);
  const height = HISTORY_CHART_HEIGHT - 2 * PAD;
  const places = placesOf(points);
  const segments = inner > 0 ? segmentsOf(places, inner, height, LINE) : [];
  const label = t("From {low} to {high}, {count} workouts", {
    low: measureLabel(measure, points[0].value, units),
    high: measureLabel(measure, points[points.length - 1].value, units),
    count: String(points.length),
  });
  return (
    <View style={styles.chart}>
      <View style={styles.row}>
        <View style={styles.side}>
          <Text style={styles.muted} testID="history-chart-high">
            {high}
          </Text>
          <Text style={styles.muted} testID="history-chart-low">
            {low}
          </Text>
        </View>
        <View
          style={styles.plot}
          onLayout={(event: LayoutChangeEvent) =>
            setWidth(event.nativeEvent.layout.width)
          }
          accessible
          accessibilityRole="image"
          accessibilityLabel={label}
          testID="history-chart"
        >
          <View style={styles.inner} pointerEvents="none">
            {segments.map((segment, i) => (
              <View
                // A chart's points never move: their place is their key.
                key={i}
                style={[
                  styles.line,
                  {
                    left: segment.left,
                    top: segment.top,
                    width: segment.length,
                    transform: [{ rotate: `${segment.angle}rad` }],
                  },
                ]}
              />
            ))}
            {inner > 0 &&
              points.map((point, i) => {
                const size = point.record ? RECORD_DOT : DOT;
                return (
                  <View
                    key={point.workout}
                    testID={point.record ? "history-dot-record" : "history-dot"}
                    style={[
                      styles.dot,
                      point.record && styles.record,
                      {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        left: places[i][0] * inner - size / 2,
                        top: places[i][1] * height - size / 2,
                      },
                    ]}
                  />
                );
              })}
          </View>
        </View>
      </View>
      <View style={styles.days}>
        <Text style={styles.muted}>{shortDay(points[0].started_at)}</Text>
        {points.length > 1 && (
          <Text style={styles.muted}>
            {shortDay(points[points.length - 1].started_at)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    gap: space.xs,
  },
  row: {
    flexDirection: "row",
    gap: space.sm,
  },
  side: {
    justifyContent: "space-between",
    height: HISTORY_CHART_HEIGHT,
  },
  plot: {
    flex: 1,
    height: HISTORY_CHART_HEIGHT,
    padding: PAD,
  },
  inner: {
    flex: 1,
  },
  line: {
    position: "absolute",
    height: LINE,
    borderRadius: LINE / 2,
    backgroundColor: color.accent,
  },
  dot: {
    position: "absolute",
    borderWidth: LINE,
    borderColor: color.accent,
    backgroundColor: color.surface,
  },
  record: {
    backgroundColor: color.accent,
  },
  days: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  empty: {
    height: HISTORY_CHART_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  muted: {
    ...font.small,
    color: color.textMuted,
  },
});
