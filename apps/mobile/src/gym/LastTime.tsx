import type { GymHistory, GymSetKind } from "@shaperoute/shared-types";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { dayLabel } from "../activities/activityText";
import { t, tPlural } from "../i18n";
import { color, font, radius, space } from "../theme/tokens";
import type { Units } from "../units/units";
import { lastTime, type Suggestion, suggestion } from "./exerciseHistory";
import { setLabel } from "./ExerciseList";
import { gymStyles } from "./gymStyles";
import type { SetValues } from "./setKinds";

/** «82.5 kg × 8», «13 reps», «+10 kg × 12», «1:05»: what a suggestion asks. */
export function suggestedLabel(
  kind: GymSetKind,
  values: SetValues,
  units: Units,
): string {
  if (kind === "bodyweight" && (values.load_kg ?? 0) === 0) {
    const reps = values.reps ?? 0;
    return tPlural(reps, "{count} rep", "{count} reps");
  }
  return setLabel({ kind, ...values, at_s: 0, live: true }, units);
}

/** «Try 82.5 kg × 8», or «Try 80 kg × 8 again». */
export function suggestionLabel(
  kind: GymSetKind,
  found: Suggestion,
  units: Units,
): string {
  const set = suggestedLabel(kind, found.values, units);
  return found.again ? t("Try {set} again", { set }) : t("Try {set}", { set });
}

/**
 * «Last time» under the exercise under way (TASK-483 part B, ADR-0392,
 * the user's «Sì, così»): the day, last time's sets, a suggestion to grow
 * by the user's rule (none for cardio), and «History». Nothing for an
 * exercise never done.
 */
export function LastTime({
  history,
  target,
  units,
  onHistory,
}: {
  history: GymHistory;
  /** What the plan followed aims at for this exercise, if any. */
  target: SetValues | null;
  units: Units;
  onHistory: () => void;
}) {
  const last = lastTime(history);
  if (last === null || history.kind === undefined) {
    return null;
  }
  const found = suggestion(last, history.kind, target, units);
  return (
    <View style={styles.box} testID="last-time">
      <View style={styles.top}>
        <Text style={styles.when}>
          {t("Last time · {day}", { day: dayLabel(last.started_at) })}
        </Text>
        <Pressable
          style={gymStyles.chip}
          onPress={onHistory}
          accessibilityRole="button"
          testID="open-history"
        >
          <Text style={gymStyles.chipText}>{`${t("History")} ›`}</Text>
        </Pressable>
      </View>
      <Text style={gymStyles.text} testID="last-time-sets">
        {last.sets.map((set) => setLabel(set, units)).join(" · ")}
      </Text>
      {found !== null && (
        <Text style={styles.try} testID="last-time-try">
          {suggestionLabel(history.kind, found, units)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: space.xs,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    padding: space.md,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
  },
  when: {
    ...font.small,
    flex: 1,
    color: color.textMuted,
  },
  try: {
    ...font.body,
    color: color.accent,
  },
});
