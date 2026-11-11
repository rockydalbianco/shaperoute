import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { durationLabel } from "../screens/FinishScreen";
import { GYM } from "../sports/gym";
import { color, font, fontSize, fontWeight, space } from "../theme/tokens";

type Props = {
  width: number;
  height: number;
  /** The workout's seconds; none, the tile shows only what it is (a
   * thumbnail). */
  durationS?: number;
  /** Its main exercises, by name (mainExercises; TASK-385 part D): none
   * when they are hidden or not here yet. */
  exercises?: readonly string[];
  /** Its energy, "184 kcal" (gymKcal.ts; TASK-385 part C): none when
   * its sets are hidden or not here yet. */
  kcal?: string | null;
};

/**
 * What a workout at the gym shows in place of the line (TASK-385 B0,
 * ADR-0327): the MuW yellow made by the app, with 🏋️, «Gym» and its time.
 * The yellow is the user's choice for this tile («Prima foto, se no
 * riquadro», 2026-11-04), the text on it `onAccent`. Part D adds the main
 * exercises, and it is the picture of the post shared too; part C the
 * energy under the time, part G will add the heart rate. A screen reader hears the card's
 * words, not the tile's.
 */
export function GymTile({
  width,
  height,
  durationS,
  exercises = [],
  kcal = null,
}: Props) {
  const small = durationS === undefined;
  return (
    <View
      style={[styles.tile, { width, height }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="gym-tile"
    >
      <Text style={small ? styles.emojiSmall : styles.emoji}>{GYM.emoji}</Text>
      {!small && (
        <>
          <Text style={styles.name}>{t(GYM.name)}</Text>
          <Text style={styles.time}>{durationLabel(durationS * 1000)}</Text>
          {kcal !== null && (
            <Text style={[styles.name, styles.energy]} testID="gym-tile-kcal">
              {kcal}
            </Text>
          )}
          {exercises.length > 0 && (
            <Text
              style={styles.exercises}
              numberOfLines={3}
              testID="gym-tile-exercises"
            >
              {exercises.join("\n")}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    backgroundColor: color.accent,
  },
  emoji: {
    fontSize: fontSize.display,
  },
  emojiSmall: {
    fontSize: fontSize.title,
  },
  name: {
    ...font.label,
    color: color.onAccent,
  },
  // The calories in red, one that reads on the yellow (TASK-424 part C3).
  energy: {
    color: color.energyOnAccent,
  },
  time: {
    ...font.title,
    color: color.onAccent,
    fontWeight: fontWeight.medium,
  },
  exercises: {
    ...font.label,
    color: color.onAccent,
    textAlign: "center",
    paddingHorizontal: space.md,
    paddingTop: space.xs,
  },
});
