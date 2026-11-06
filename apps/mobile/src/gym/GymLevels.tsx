import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { gymLevelsOf } from "../api/gym";
import { t } from "../i18n";
import { useLanguage } from "../i18n/useLanguage";
import {
  color,
  font,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { useUnits } from "../units/useUnits";
import { exerciseName } from "./catalog";
import { figureOf } from "./figures";
import { levelValue } from "./levelValue";

/** The exercises shown before «Show more» (the user's choice, 2026-11-06). */
export const LEVELS_SHOWN = 5;

type Props = {
  /** `gym_levels` of the profile, as the API gave it. */
  levels: unknown;
};

/**
 * The levels at the gym on a profile (TASK-385 E, ADR-0327): each exercise
 * at level 1 or more with its figure and its best set, the highest level
 * first, as the API orders them. Every workout counts, private ones too, and
 * only figure, exercise and value show (the user's choice, 2026-11-06). The
 * first five, the others under «Show more». Nothing without a level.
 */
export function GymLevels({ levels }: Props) {
  const units = useUnits();
  const language = useLanguage();
  const [all, setAll] = useState(false);
  const known = gymLevelsOf(levels);
  if (known.length === 0) {
    return null;
  }
  const shown = all ? known : known.slice(0, LEVELS_SHOWN);
  return (
    <View style={styles.box} testID="gym-levels">
      <Text style={styles.title} accessibilityRole="header">
        {`🏋️ ${t("Gym")}`}
      </Text>
      {shown.map((level) => {
        const figure = figureOf(level.level);
        const name = exerciseName({ exercise: level.exercise }, language);
        const value = levelValue(level, units);
        return (
          <View
            key={level.exercise}
            style={styles.row}
            accessible
            accessibilityLabel={`${name}, ${t(figure.name)}, ${value}`}
            testID="gym-level"
          >
            <Text style={styles.emoji} importantForAccessibility="no">
              {figure.emoji}
            </Text>
            <View style={styles.rowText}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.figure}>{t(figure.name)}</Text>
            </View>
            <Text style={styles.value}>{value}</Text>
          </View>
        );
      })}
      {!all && known.length > LEVELS_SHOWN && (
        <Tap
          style={styles.more}
          onPress={() => setAll(true)}
          accessibilityRole="button"
          testID="gym-levels-more"
        >
          <Text style={styles.moreText}>{t("Show more")}</Text>
        </Tap>
      )}
    </View>
  );
}

// As the personal bests over it (PersonalBests.tsx): a box on the surface.
const styles = StyleSheet.create({
  box: {
    gap: space.sm,
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
    gap: space.md,
    minHeight: MIN_TAP_SIZE,
    paddingVertical: space.xs,
  },
  emoji: {
    fontSize: fontSize.heading,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  figure: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  value: {
    color: color.text,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  more: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
  },
  // As «Show more» in the conversations: the text's colour, not the
  // yellow, which fails the contrast on the surface.
  moreText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
