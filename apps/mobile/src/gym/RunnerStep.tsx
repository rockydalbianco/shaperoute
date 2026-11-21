import type { GymPlanRunner, GymPlanSession } from "@shaperoute/shared-types";
import { useState } from "react";
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
import { RUN_NAMES } from "./proposal";
import {
  clock,
  LEVELS,
  LONG_RANGE_M,
  LONG_RANGE_S,
  PACE_RANGE_S,
  paceOf,
  runFor,
} from "./runPace";
import { runAmount } from "./runDay";

/** The steps of the boxes: five seconds a km, a km, five minutes. */
const PACE_STEP_S = 5;
const LONG_STEP_M = 1000;
const LONG_STEP_S = 300;

function clamp(value: number, [lowest, highest]: readonly [number, number]): number {
  return Math.min(highest, Math.max(lowest, value));
}

/** «55 minutes», «1 h 05»: the time of 10 km at `paceS`. */
function tenKmTime(paceS: number): string {
  const minutes = Math.round((paceS * 10) / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`
    : t("{n} minutes", { n: String(minutes) });
}

/**
 * «How do you run today?» (TASK-452, the mockup D1 approved on 2026-11-11):
 * the pace over 10 km and the long run of today, with − and +, the long run
 * in km or minutes; «I don't know» picks a level. Shown by the guide only
 * when the plan has run days.
 */
export function RunnerQuestions({
  runner,
  onChange,
}: {
  runner: GymPlanRunner;
  onChange: (runner: GymPlanRunner) => void;
}) {
  const [levels, setLevels] = useState(false);
  const byTime = runner.long_s !== undefined;

  function long(by: number) {
    onChange(
      byTime
        ? {
            pace_10k_s: runner.pace_10k_s,
            long_s: clamp((runner.long_s ?? 0) + by * LONG_STEP_S, LONG_RANGE_S),
          }
        : {
            pace_10k_s: runner.pace_10k_s,
            long_m: clamp((runner.long_m ?? 0) + by * LONG_STEP_M, LONG_RANGE_M),
          },
    );
  }

  function unit(minutes: boolean) {
    if (minutes === byTime) {
      return;
    }
    // At the long run's pace (+1:15 on the pace over 10 km).
    const paceS = runner.pace_10k_s + 75;
    onChange(
      minutes
        ? {
            pace_10k_s: runner.pace_10k_s,
            long_s: clamp(
              Math.round((((runner.long_m ?? 10000) / 1000) * paceS) / LONG_STEP_S) *
                LONG_STEP_S,
              LONG_RANGE_S,
            ),
          }
        : {
            pace_10k_s: runner.pace_10k_s,
            long_m: clamp(
              Math.round((((runner.long_s ?? 3600) / paceS) * 1000) / LONG_STEP_M) *
                LONG_STEP_M,
              LONG_RANGE_M,
            ),
          },
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.label}>{t("Your pace over 10 km").toUpperCase()}</Text>
        <Stepper
          value={clock(runner.pace_10k_s)}
          unit="/km"
          testID="runner-pace"
          onLess={() =>
            onChange({
              ...runner,
              pace_10k_s: clamp(runner.pace_10k_s - PACE_STEP_S, PACE_RANGE_S),
            })
          }
          onMore={() =>
            onChange({
              ...runner,
              pace_10k_s: clamp(runner.pace_10k_s + PACE_STEP_S, PACE_RANGE_S),
            })
          }
        />
        <Text style={styles.note}>
          {t("10 km in {time}", { time: tenKmTime(runner.pace_10k_s) })}
        </Text>
        {levels ? (
          <View style={styles.toggle}>
            {LEVELS.map((level) => (
              <Pressable
                key={level.title}
                style={[
                  styles.toggleOption,
                  level.pace10kS === runner.pace_10k_s && styles.toggleOn,
                ]}
                onPress={() =>
                  onChange({ pace_10k_s: level.pace10kS, long_m: level.longM })
                }
                accessibilityRole="radio"
                accessibilityState={{ selected: level.pace10kS === runner.pace_10k_s }}
                testID={`runner-level-${level.pace10kS}`}
              >
                <Text style={styles.toggleText}>{t(level.title)}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Pressable
            style={styles.link}
            onPress={() => setLevels(true)}
            accessibilityRole="button"
            testID="runner-levels"
          >
            <Text style={styles.linkText}>{t("I don't know: I'll pick my level")}</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>{t("Your long run, today").toUpperCase()}</Text>
        <Stepper
          value={
            byTime
              ? String(Math.round((runner.long_s ?? 0) / 60))
              : String((runner.long_m ?? 0) / 1000)
          }
          unit={byTime ? "min" : "km"}
          testID="runner-long"
          onLess={() => long(-1)}
          onMore={() => long(1)}
        />
        <View style={styles.toggle}>
          {[false, true].map((minutes) => (
            <Pressable
              key={String(minutes)}
              style={[styles.toggleOption, minutes === byTime && styles.toggleOn]}
              onPress={() => unit(minutes)}
              accessibilityRole="radio"
              accessibilityState={{ selected: minutes === byTime }}
              testID={minutes ? "runner-unit-min" : "runner-unit-km"}
            >
              <Text style={styles.toggleText}>{minutes ? t("minutes") : "km"}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.note}>{t("The longest run you do without strain")}</Text>
      </View>
    </View>
  );
}

function Stepper({
  value,
  unit,
  testID,
  onLess,
  onMore,
}: {
  value: string;
  unit: string;
  testID: string;
  onLess: () => void;
  onMore: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        style={styles.round}
        onPress={onLess}
        accessibilityRole="button"
        accessibilityLabel="−"
        testID={`${testID}-less`}
      >
        <Text style={styles.roundText}>−</Text>
      </Pressable>
      <View style={styles.value} accessible accessibilityLabel={`${value} ${unit}`}>
        <Text style={styles.valueText} testID={testID}>
          {value}
        </Text>
        <Text style={styles.unitText}>{unit}</Text>
      </View>
      <Pressable
        style={styles.round}
        onPress={onMore}
        accessibilityRole="button"
        accessibilityLabel="+"
        testID={`${testID}-more`}
      >
        <Text style={styles.roundText}>+</Text>
      </Pressable>
    </View>
  );
}

/** The kind's line under its name on «Your paces». */
function detailOf(session: GymPlanSession): string {
  return session.run === undefined ? "" : runAmount(session.run);
}

/**
 * «Your paces» (the mockup D2): the run days of the plan made for the
 * runner, each with its pace; how they are worked out; and that new paces
 * come at the end of each cycle from the runs saved.
 */
export function RunnerPaces({
  runner,
  sessions,
}: {
  runner: GymPlanRunner;
  sessions: GymPlanSession[];
}) {
  const runs = sessions.filter((one) => one.run !== undefined);
  return (
    <View style={styles.page}>
      <View style={styles.list}>
        {runs.map((session, index) => {
          const run = runFor(session.run!, runner);
          return (
            <View key={session.day} style={[styles.row, index > 0 && styles.rowRule]}>
              <Text style={styles.mark} importantForAccessibility="no">
                RUN
              </Text>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{t(RUN_NAMES[run.kind])}</Text>
                <Text style={styles.note}>{detailOf({ ...session, run })}</Text>
              </View>
              <Text style={styles.pace} testID={`runner-pace-${run.kind}`}>
                {clock(paceOf(run, runner))}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={[styles.note, styles.right]}>{t("minutes per km")}</Text>
      <View style={styles.card}>
        <Text style={styles.rowTitle}>{t("How I work them out")}</Text>
        <Text style={styles.note}>
          {t(
            "Easy: your pace over 10 km + 1:05. Long: + 1:15. Intervals of 400 m: − 0:25. The long run starts from yours and grows 1 km a week; the easy run is about half of it.",
          )}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.rowTitle}>{t("At the end of each cycle")}</Text>
        <Text style={styles.note}>
          {t("I look at your runs: if you got faster, I propose new paces.")}
        </Text>
      </View>
    </View>
  );
}

const ROUND = 52;

const styles = StyleSheet.create({
  page: {
    gap: space.md,
  },
  card: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  label: {
    ...font.label,
    color: color.textMuted,
  },
  stepper: {
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
  note: {
    ...font.small,
    color: color.textMuted,
  },
  right: {
    textAlign: "right",
  },
  link: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  linkText: {
    color: color.textMuted,
    fontSize: fontSize.small,
    textDecorationLine: "underline",
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
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  list: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
  },
  rowRule: {
    borderTopWidth: 1,
    borderColor: color.surfaceRaised,
  },
  mark: {
    width: 40,
    height: 40,
    lineHeight: 40,
    textAlign: "center",
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: color.surfaceRaised,
    color: color.runDay,
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  pace: {
    color: color.text,
    fontSize: 17,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
});
