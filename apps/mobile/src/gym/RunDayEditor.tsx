import type { GymPlanMode, GymPlanRun, GymRunKind } from "@shaperoute/shared-types";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import {
  color,
  font,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { runInWeek } from "./program";
import { proposedRun } from "./proposal";
import { RUN_KINDS, runAmount } from "./runDay";

/** The steps of the boxes: half a km, five minutes, one rep. */
const KM_STEP_M = 500;
const MINUTE_STEP_S = 300;
/** The lengths of a rep the guide offers, in metres. */
export const REP_LENGTHS_M = [200, 400, 800, 1000] as const;

function clamp(value: number, lowest: number, highest: number): number {
  return Math.min(highest, Math.max(lowest, value));
}

/** The run as another kind: the guide's for it, the distance kept when
 * both are distances. */
function asKind(run: GymPlanRun, kind: GymRunKind): GymPlanRun {
  if (kind === run.kind) {
    return run;
  }
  const fresh = proposedRun(kind === "easy" ? 0 : kind === "long" ? 1 : 2, "muscle");
  if (kind !== "intervals" && run.kind !== "intervals") {
    return { ...run, kind };
  }
  return fresh;
}

/** «5 · 5.5 · 6 km, week 4: 4 km to recover»: the run over a cycle. */
export function growthLine(run: GymPlanRun, mode: GymPlanMode, weeks: number): string {
  if (weeks <= 1 || mode === "same") {
    return t("The same every week.");
  }
  const lighter = weeks >= 3;
  const growing = Array.from({ length: lighter ? weeks - 1 : weeks }, (_, i) =>
    runAmount(runInWeek(run, mode, weeks, i + 1, 0)),
  );
  const values = growing.join(" · ");
  if (!lighter) {
    return values;
  }
  return t("{values}; week {n}: {last} to recover", {
    values,
    n: String(weeks),
    last: runAmount(runInWeek(run, mode, weeks, weeks, 0)),
  });
}

/**
 * A run day of the guide (TASK-433 C, the mockup «C2» approved on
 * 2026-11-10): the kind (easy, intervals, long), how much with − and +, in
 * km or minutes (intervals: how many and how long each), and how it grows
 * with the weeks.
 */
export function RunDayEditor({
  run,
  mode,
  weeks,
  onChange,
}: {
  run: GymPlanRun;
  mode: GymPlanMode;
  weeks: number;
  onChange: (run: GymPlanRun) => void;
}) {
  const byTime = run.kind !== "intervals" && run.duration_s !== undefined;

  function step(by: number) {
    if (run.kind === "intervals") {
      onChange({ ...run, reps: clamp((run.reps ?? 1) + by, 1, 50) });
    } else if (byTime) {
      onChange({
        ...run,
        duration_s: clamp((run.duration_s ?? 0) + by * MINUTE_STEP_S, 300, 6 * 3600),
      });
    } else {
      onChange({
        ...run,
        distance_m: clamp((run.distance_m ?? 0) + by * KM_STEP_M, 500, 100_000),
      });
    }
  }

  function unit(minutes: boolean) {
    if (run.kind === "intervals" || minutes === byTime) {
      return;
    }
    // About 6 minutes a km, to the nearest step.
    if (minutes) {
      const seconds = Math.round(((run.distance_m ?? 5000) * 0.36) / MINUTE_STEP_S);
      onChange({
        kind: run.kind,
        duration_s: clamp(seconds * MINUTE_STEP_S, 300, 21600),
      });
    } else {
      const metres = Math.round((run.duration_s ?? 1800) / 0.36 / KM_STEP_M);
      onChange({ kind: run.kind, distance_m: clamp(metres * KM_STEP_M, 500, 100_000) });
    }
  }

  const [value, unitLabel] =
    run.kind === "intervals"
      ? [String(run.reps ?? 1), `× ${run.rep_m ?? 400} m`]
      : byTime
        ? [String(Math.round((run.duration_s ?? 0) / 60)), "min"]
        : [runAmount(run).replace(" km", ""), "km"];

  return (
    <View style={styles.editor} testID="run-day-editor">
      <Text style={styles.label}>{t("Which run").toUpperCase()}</Text>
      <View style={styles.kinds}>
        {RUN_KINDS.map((one) => {
          const on = one.kind === run.kind;
          return (
            <Pressable
              key={one.kind}
              style={[styles.kind, on && styles.kindOn]}
              onPress={() => onChange(asKind(run, one.kind))}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              testID={`run-kind-${one.kind}`}
            >
              <Text style={styles.kindTitle}>{t(one.title)}</Text>
              <Text style={styles.kindLine}>{t(one.line)}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>{t("How much").toUpperCase()}</Text>
        <View style={styles.amount}>
          <Pressable
            style={styles.round}
            onPress={() => step(-1)}
            accessibilityRole="button"
            accessibilityLabel="−"
            testID="run-less"
          >
            <Text style={styles.roundText}>−</Text>
          </Pressable>
          <View style={styles.value} accessible accessibilityLabel={runAmount(run)}>
            <Text style={styles.valueText} testID="run-value">
              {value}
            </Text>
            <Text style={styles.unitText}>{unitLabel}</Text>
          </View>
          <Pressable
            style={styles.round}
            onPress={() => step(1)}
            accessibilityRole="button"
            accessibilityLabel="+"
            testID="run-more"
          >
            <Text style={styles.roundText}>+</Text>
          </Pressable>
        </View>
        {run.kind === "intervals" ? (
          <View style={styles.toggle}>
            {REP_LENGTHS_M.map((metres) => {
              const on = run.rep_m === metres;
              return (
                <Pressable
                  key={metres}
                  style={[styles.toggleOption, on && styles.toggleOn]}
                  onPress={() =>
                    onChange({ kind: "intervals", reps: run.reps, rep_m: metres })
                  }
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  testID={`run-rep-${metres}`}
                >
                  <Text style={[styles.toggleText, on && styles.toggleTextOn]}>
                    {`${metres} m`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.toggle}>
            {[false, true].map((minutes) => {
              const on = minutes === byTime;
              return (
                <Pressable
                  key={String(minutes)}
                  style={[styles.toggleOption, on && styles.toggleOn]}
                  onPress={() => unit(minutes)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  testID={minutes ? "run-unit-min" : "run-unit-km"}
                >
                  <Text style={[styles.toggleText, on && styles.toggleTextOn]}>
                    {minutes ? t("minutes") : "km"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
      <View style={styles.note}>
        <Text style={styles.noteTitle}>{t("With the weeks")}</Text>
        <Text style={styles.noteLine} testID="run-growth">
          {growthLine(run, mode, weeks)}
        </Text>
      </View>
    </View>
  );
}

const ROUND = 52;

const styles = StyleSheet.create({
  editor: {
    gap: space.md,
  },
  label: {
    ...font.label,
    color: color.textMuted,
  },
  kinds: {
    flexDirection: "row",
    gap: space.sm,
  },
  kind: {
    flex: 1,
    minHeight: MIN_TAP_SIZE + space.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: space.xs,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  kindOn: {
    borderWidth: 2,
    borderColor: color.accent,
    backgroundColor: color.surfaceRaised,
  },
  kindTitle: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  kindLine: {
    ...font.detail,
    color: color.textMuted,
    textAlign: "center",
  },
  card: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  amount: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  round: {
    width: ROUND,
    height: ROUND,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: ROUND / 2,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  roundText: {
    color: color.text,
    fontSize: 24,
  },
  value: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.xs,
  },
  valueText: {
    color: color.text,
    fontSize: 48,
    lineHeight: 56,
    fontWeight: fontWeight.bold,
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  unitText: {
    color: color.textMuted,
    fontSize: 18,
  },
  toggle: {
    flexDirection: "row",
    gap: space.xs,
    padding: space.xs,
    borderRadius: radius.md,
    backgroundColor: color.background,
  },
  toggleOption: {
    flex: 1,
    minHeight: MIN_TAP_SIZE - space.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  toggleOn: {
    backgroundColor: color.surfaceRaised,
  },
  toggleText: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  toggleTextOn: {
    color: color.text,
    fontWeight: fontWeight.semibold,
  },
  note: {
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  noteTitle: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  noteLine: {
    ...font.small,
    color: color.textMuted,
  },
});
