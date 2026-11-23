import type { GymExercises } from "@shaperoute/shared-types";
import { StyleSheet, Text, View } from "react-native";

import { gymLevelsOf } from "../api/gym";
import { t } from "../i18n";
import { useLanguage } from "../i18n/useLanguage";
import { color, font, fontWeight, space } from "../theme/tokens";
import { useUnits } from "../units/useUnits";
import { exerciseName } from "./catalog";
import { figureLabel } from "./figures";
import { levelValue } from "./levelValue";

type Props = {
  /** The exercises of the post; null while they come or when hidden. */
  exercises: GymExercises | null;
};

/**
 * The levels a workout at the gym reached first, on its post (TASK-385 E,
 * ADR-0327): «New level: 🦍 Gorilla · Bench press 140 kg», the highest
 * first. Nothing when it reached none, when its owner hides the exercises
 * or from an API older than part E. The text is the user's, approved on
 * 2026-11-04.
 */
export function NewLevels({ exercises }: Props) {
  const units = useUnits();
  const language = useLanguage();
  const levels = gymLevelsOf(exercises?.new_levels);
  if (levels.length === 0) {
    return null;
  }
  return (
    <View style={styles.list} testID="gym-new-levels">
      {levels.map((level) => (
        <Text key={level.exercise} style={styles.line}>
          {t("New level: {figure} · {exercise} {value}", {
            figure: figureLabel(level.level),
            exercise: exerciseName({ exercise: level.exercise }, language),
            value: levelValue(level, units),
          })}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.xs,
  },
  line: {
    ...font.small,
    color: color.text,
    fontWeight: fontWeight.semibold,
  },
});
