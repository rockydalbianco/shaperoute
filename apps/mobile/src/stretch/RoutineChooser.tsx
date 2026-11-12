import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Figure } from "./Figure";
import { STAND } from "./poses";
import { MINUTES, type Minutes, routine, type RoutineKey } from "./routines";

/**
 * How long to stretch (TASK-466 part B, ADR-0378): before the first exercise
 * of a routine, three buttons, 3, 5 and 10 minutes, under the routine's name
 * and the figure standing ready (the user's choice of 2026-11-12: the length
 * is chosen on the stretching screen, not on the reminder). «Not now»
 * leaves, as «End» does later.
 */

type Props = {
  routine: RoutineKey;
  onChoose: (minutes: Minutes) => void;
  onLeave: () => void;
};

export function RoutineChooser({ routine: key, onChoose, onLeave }: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const figureHeight = Math.min(360, windowHeight * 0.4);
  return (
    <View style={styles.screen} testID="stretch-chooser">
      <View style={styles.top}>
        <Text style={styles.label}>{t("Stretch")}</Text>
        <Text style={styles.name} accessibilityRole="header">
          {t(routine(key).name)}
        </Text>
        <Text style={styles.ask}>{t("How long?")}</Text>
      </View>
      <Figure pose={STAND} height={figureHeight} testID="stretch-figure" />
      <View style={styles.bottom}>
        <View style={styles.lengths}>
          {MINUTES.map((minutes) => (
            <Pressable
              key={minutes}
              style={styles.length}
              onPress={() => onChoose(minutes)}
              accessibilityRole="button"
            >
              <Text style={styles.lengthText}>{t("{minutes} min", { minutes })}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.leave} onPress={onLeave} accessibilityRole="button">
          <Text style={styles.leaveText}>{t("Not now")}</Text>
        </Pressable>
        <Text style={styles.care}>{t("Stop if it hurts.")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: space.xxl * 2,
    paddingBottom: space.xxl,
    paddingHorizontal: space.xl,
    backgroundColor: color.background,
  },
  top: {
    gap: space.sm,
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  name: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  ask: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  bottom: {
    gap: space.md,
    alignItems: "center",
  },
  lengths: {
    alignSelf: "stretch",
    flexDirection: "row",
    gap: space.sm,
  },
  length: {
    flex: 1,
    minHeight: MIN_TAP_SIZE * 1.4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.accent,
  },
  lengthText: {
    color: color.onAccent,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  leave: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  leaveText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  care: {
    color: color.textFaint,
    fontSize: fontSize.small,
  },
});
