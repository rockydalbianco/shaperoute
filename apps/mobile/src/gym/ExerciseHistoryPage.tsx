import type {
  GymHistory,
  GymHistoryMeasure,
  GymHistoryRecord,
  GymHistoryRecordKind,
} from "@shaperoute/shared-types";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { dayLabel } from "../activities/activityText";
import { weightLabel } from "../body/bodyUnits";
import { t, tPlural } from "../i18n";
import { clockLabel } from "../navigation/freeRun";
import { color, font, fontSize, fontWeight, radius, space } from "../theme/tokens";
import { distanceLabel } from "../units/format";
import type { Units } from "../units/units";
import {
  changeLabel,
  changeOf,
  HISTORY_RANGES,
  type HistoryRange,
  isRecordWorkout,
  measureLabel,
  pointsIn,
} from "./exerciseHistory";
import { setLabel } from "./ExerciseList";
import { gymStyles } from "./gymStyles";
import { HistoryChart, shortDay } from "./HistoryChart";
import type { ExerciseHistoryState } from "./useExerciseHistory";

/** What the chart follows, over it. */
export function measureTitle(measure: GymHistoryMeasure): string {
  switch (measure) {
    case "estimated_1rm_kg":
      return t("Estimated max");
    case "reps":
      return t("Best set (reps)");
    case "duration_s":
      return t("Longest set");
    case "distance_m":
      return t("Farthest");
  }
}

function rangeName(range: HistoryRange): string {
  return range === "all" ? t("All time") : range;
}

/** The name of a record. */
export function recordName(kind: GymHistoryRecordKind): string {
  switch (kind) {
    case "best_estimate_kg":
      return t("Estimated max");
    case "heaviest_kg":
      return t("Heaviest");
    case "most_reps":
      return t("Most reps");
    case "best_volume_kg":
      return t("Best volume");
    case "longest_s":
      return t("Longest time");
    case "farthest_m":
      return t("Farthest");
  }
}

/** A record's value as it is read. */
export function recordValue(record: GymHistoryRecord, units: Units): string {
  switch (record.kind) {
    case "best_estimate_kg":
    case "heaviest_kg":
    case "best_volume_kg":
      return weightLabel(record.value, units);
    case "most_reps":
      return String(record.value);
    case "longest_s":
      return clockLabel(record.value * 1000);
    case "farthest_m":
      return distanceLabel(record.value, units);
  }
}

/** «↑ +2.9 kg», «↓ −1», «=»: a workout against the one before. */
export function arrowLabel(
  measure: GymHistoryMeasure,
  change: number,
  units: Units,
): string {
  const arrow = change > 0 ? "↑ " : change < 0 ? "↓ " : "";
  return `${arrow}${changeLabel(measure, change, units)}`;
}

/**
 * «History» of one exercise (TASK-483 part B, ADR-0392, the user's «Sì,
 * così»): the chart over 1M, 3M, 1Y or all of it, of the estimated max for
 * a load (said «estimated»), the reps, the seconds or the metres; the
 * records; every workout, the newest first, with its sets, an arrow against
 * the one before and «PR» on a record. In place of the screen it opens
 * from, as the guide.
 */
export function ExerciseHistory({
  title,
  state,
  units,
  nowMs,
  onBack,
}: {
  title: string;
  state: ExerciseHistoryState;
  units: Units;
  nowMs: number;
  onBack: () => void;
}) {
  const [range, setRange] = useState<HistoryRange>("3M");
  const history = state.history;
  return (
    <View style={styles.page} testID="exercise-history">
      <View style={styles.top}>
        <Pressable
          style={gymStyles.chip}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t("Back")}
          testID="history-back"
        >
          <Text style={gymStyles.chipText}>‹</Text>
        </Pressable>
        <View style={styles.titles}>
          <Text style={gymStyles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={gymStyles.muted}>{t("History")}</Text>
        </View>
      </View>
      {history === null ? (
        <Text style={gymStyles.muted} testID="history-waiting">
          {state.failed
            ? t("No connection. Check the network and try again.")
            : t("Loading…")}
        </Text>
      ) : (
        <Shown
          history={history}
          range={range}
          onRange={setRange}
          units={units}
          nowMs={nowMs}
          state={state}
        />
      )}
    </View>
  );
}

function Shown({
  history,
  range,
  onRange,
  units,
  nowMs,
  state,
}: {
  history: GymHistory;
  range: HistoryRange;
  onRange: (range: HistoryRange) => void;
  units: Units;
  nowMs: number;
  state: ExerciseHistoryState;
}) {
  const measure = history.measure;
  if (measure === undefined || history.workouts_count === 0) {
    return (
      <Text style={gymStyles.muted} testID="history-none">
        {t("No workouts with this exercise yet.")}
      </Text>
    );
  }
  const shown = pointsIn(history.points, range, nowMs);
  const latest = history.points.at(-1);
  return (
    <ScrollView contentContainerStyle={styles.body}>
      <View style={styles.card}>
        <Text style={gymStyles.muted}>{measureTitle(measure)}</Text>
        {latest !== undefined && (
          <Text style={styles.big} testID="history-latest">
            {measureLabel(measure, latest.value, units)}
          </Text>
        )}
        <View style={styles.ranges}>
          {HISTORY_RANGES.map((one) => (
            <Pressable
              key={one}
              style={[gymStyles.chip, one === range && gymStyles.chipOn]}
              onPress={() => onRange(one)}
              accessibilityRole="button"
              accessibilityState={{ selected: one === range }}
              testID={`history-range-${one}`}
            >
              <Text style={[gymStyles.chipText, one === range && gymStyles.chipTextOn]}>
                {rangeName(one)}
              </Text>
            </Pressable>
          ))}
        </View>
        <HistoryChart points={shown} measure={measure} units={units} />
        {measure === "estimated_1rm_kg" && (
          <Text style={styles.note}>
            {t("Estimated from your sets of up to 12 reps.")}
          </Text>
        )}
      </View>
      {history.records.length > 0 && (
        <>
          <Text style={styles.heading} accessibilityRole="header">
            {t("Records")}
          </Text>
          <View style={styles.records}>
            {history.records.map((record) => (
              <View
                key={record.kind}
                style={styles.record}
                accessible
                testID={`record-${record.kind}`}
              >
                <Text style={gymStyles.muted}>{recordName(record.kind)}</Text>
                <Text style={styles.recordValue}>{recordValue(record, units)}</Text>
                <Text style={styles.note}>
                  {record.set === undefined
                    ? shortDay(record.started_at)
                    : `${setLabel(record.set, units)} · ${shortDay(record.started_at)}`}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
      <Text style={styles.heading} accessibilityRole="header">
        {tPlural(history.workouts_count, "{count} workout", "{count} workouts")}
      </Text>
      {history.workouts.map((workout) => {
        const change = changeOf(history.points, workout.id);
        const record = isRecordWorkout(history.points, workout.id);
        return (
          <View
            key={workout.id}
            style={styles.workout}
            testID={`history-${workout.id}`}
          >
            <View style={styles.workoutTop}>
              <Text style={[gymStyles.text, styles.day]}>
                {dayLabel(workout.started_at)}
              </Text>
              {record && (
                <View style={styles.pr} testID="history-pr">
                  <Text style={styles.prText}>{t("PR")}</Text>
                </View>
              )}
              {change !== null && (
                <Text
                  style={[styles.change, change > 0 && styles.up]}
                  testID="history-change"
                >
                  {arrowLabel(measure, change, units)}
                </Text>
              )}
            </View>
            <Text style={gymStyles.muted}>
              {workout.sets.map((set) => setLabel(set, units)).join(" · ")}
            </Text>
          </View>
        );
      })}
      {(state.loadMore !== null || state.loadingMore) && (
        <Pressable
          style={[gymStyles.button, state.loadingMore && gymStyles.disabled]}
          disabled={state.loadMore === null}
          onPress={() => state.loadMore?.()}
          accessibilityRole="button"
          testID="history-more"
        >
          <Text style={gymStyles.buttonText}>
            {state.loadingMore ? t("Loading…") : t("Show more")}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    gap: space.sm,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  titles: {
    flex: 1,
  },
  body: {
    gap: space.md,
    paddingBottom: space.xxl,
  },
  card: {
    gap: space.sm,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    padding: space.md,
  },
  big: {
    color: color.text,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  ranges: {
    flexDirection: "row",
    gap: space.sm,
  },
  note: {
    ...font.small,
    color: color.textMuted,
  },
  heading: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  records: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  record: {
    flexGrow: 1,
    flexBasis: 140,
    gap: space.xs,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    padding: space.md,
  },
  recordValue: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    fontVariant: ["tabular-nums"],
  },
  workout: {
    gap: space.xs,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  workoutTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  day: {
    flex: 1,
  },
  pr: {
    borderRadius: radius.pill,
    backgroundColor: color.accent,
    paddingHorizontal: space.sm,
  },
  prText: {
    color: color.onAccent,
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
  },
  change: {
    ...font.small,
    color: color.textMuted,
    fontVariant: ["tabular-nums"],
  },
  up: {
    color: color.accent,
  },
});
