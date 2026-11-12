import type { GymPlanOuting, GymProgram } from "@shaperoute/shared-types";
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
import { doneLine, outingAmount, outingName } from "./outingDay";
import {
  distanceStep,
  roundClimb,
  roundDistance,
  targetDayInWeek,
} from "./targetWeeks";

/**
 * A day out in the guide's plan (TASK-461 B and C, ADR-0371): its name and
 * how much, with − and +, and how it grows over the weeks toward the
 * target. As `RunDayEditor` is for a run day.
 */

function clamp(value: number, lowest: number, highest: number): number {
  return Math.min(highest, Math.max(lowest, value));
}

/** The day one step more (`+1`) or less (`-1`): its distance, its climb,
 * its minutes or its repetitions. */
export function stepOuting(outing: GymPlanOuting, by: 1 | -1): GymPlanOuting {
  if (outing.kind === "intervals") {
    return { ...outing, reps: clamp((outing.reps ?? 1) + by, 1, 50) };
  }
  if (outing.kind === "climb" && outing.climb_m !== undefined) {
    const climb = roundClimb(outing.climb_m + by * 50);
    return { ...outing, climb_m: climb };
  }
  if (outing.distance_m !== undefined) {
    const step = distanceStep(outing.sport);
    return {
      ...outing,
      distance_m: roundDistance(outing.distance_m + by * step, outing.sport),
    };
  }
  return {
    ...outing,
    duration_s: clamp((outing.duration_s ?? 0) + by * 300, 300, 12 * 3600),
  };
}

/** «Weeks: 30 · 33 · 36 km … 60 km»: the day over the plan, or the same
 * each week without a target. */
export function weeksLine(
  session: { day: number; outing: GymPlanOuting },
  program: GymProgram,
): string {
  if (program.target === undefined || program.weeks <= 1) {
    return t("The same every week.");
  }
  const at = (week: number) => {
    const one = targetDayInWeek(
      { day: session.day, name: "", items: [], outing: session.outing },
      program,
      week,
    ).outing;
    return one === undefined ? "" : outingAmount(one);
  };
  const last = program.weeks;
  return t("Weeks: {first} · {second} · {third} … {last}", {
    first: at(1),
    second: at(2),
    third: at(3),
    last: at(last),
  });
}

export function OutingDayEditor({
  day,
  outing,
  program,
  onChange,
}: {
  day: number;
  outing: GymPlanOuting;
  program: GymProgram;
  onChange: (outing: GymPlanOuting) => void;
}) {
  return (
    <View style={styles.editor} testID="outing-day-editor">
      <Text style={styles.title}>{t(outingName(outing))}</Text>
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.round, pressed && styles.pressed]}
          onPress={() => onChange(stepOuting(outing, -1))}
          accessibilityRole="button"
          accessibilityLabel={t("Less")}
          testID="outing-less"
        >
          <Text style={styles.roundText}>−</Text>
        </Pressable>
        <Text style={styles.value} testID="outing-value">
          {outingAmount(outing)}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.round, pressed && styles.pressed]}
          onPress={() => onChange(stepOuting(outing, 1))}
          accessibilityRole="button"
          accessibilityLabel={t("More")}
          testID="outing-more"
        >
          <Text style={styles.roundText}>+</Text>
        </Pressable>
      </View>
      <Text style={styles.note} testID="outing-weeks">
        {weeksLine({ day, outing }, program)}
      </Text>
      <Text style={styles.small}>{doneLine(outing)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  editor: {
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  title: {
    ...font.heading,
    color: color.text,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  round: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    borderRadius: MIN_TAP_SIZE / 2,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  roundText: {
    color: color.text,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
  },
  value: {
    flex: 1,
    textAlign: "center",
    color: color.text,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
  },
  note: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  small: {
    color: color.textFaint,
    fontSize: fontSize.small,
  },
  pressed: {
    opacity: 0.7,
  },
});
