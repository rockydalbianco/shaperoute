import { Pressable, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { color, font, radius, space } from "../theme/tokens";
import type { Units } from "../units/units";
import { recordName, recordValue } from "./ExerciseHistoryPage";
import { gymStyles } from "./gymStyles";
import type { ExerciseHistoryState } from "./useExerciseHistory";

/**
 * The line of the guide under «Watch out» (TASK-483 part B, the user's «Sì,
 * anche fuori»): the exercise's first record (the estimated max of a load,
 * the most reps of the body, the longest or the farthest) and «History».
 * Nothing for an exercise never done, without an account or with an API
 * that has no history.
 */
export function GuideHistoryLine({
  state,
  units,
  onHistory,
}: {
  state: ExerciseHistoryState;
  units: Units;
  onHistory: () => void;
}) {
  const best = state.history?.records[0];
  if (state.off || best === undefined) {
    return null;
  }
  return (
    <View style={styles.line} testID="guide-history">
      <Text style={styles.best}>
        {`${recordName(best.kind)}: ${recordValue(best, units)}`}
      </Text>
      <Pressable
        style={gymStyles.chip}
        onPress={onHistory}
        accessibilityRole="button"
        testID="guide-open-history"
      >
        <Text style={gymStyles.chipText}>{`${t("History")} ›`}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    padding: space.md,
  },
  best: {
    ...font.body,
    flex: 1,
    color: color.text,
  },
});
