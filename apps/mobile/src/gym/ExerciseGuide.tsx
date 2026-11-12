import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import type { Language } from "../i18n/languages";
import { color, fontSize, fontWeight, radius, space } from "../theme/tokens";
import type { GymExercise } from "./catalog";
import { ExerciseFigure } from "./ExerciseFigure";
import { groupName } from "./groups";
import { guideOf } from "./guides";
import { gymStyles } from "./gymStyles";
import { moveOf } from "./moves";
import { MuscleCaption, MuscleMap } from "./MuscleMap";
import { musclesOf } from "./muscles";

/** The side of the big figure of the guide. */
export const GUIDE_FIGURE_SIZE = 200;
/** The height of the bodies beside it, with the muscles worked (TASK-465). */
export const GUIDE_BODY_HEIGHT = 132;

/** Whether `key` has a guide: every exercise of the catalog does. */
export function hasGuide(key: string, language: Language): boolean {
  return guideOf(key, language) !== null && moveOf(key) !== null;
}

/**
 * How to do an exercise (TASK-411 part E, ADR-0341): the figure big, beside
 * it the body with the muscles it works (TASK-465), its three steps and
 * what to watch out for; «Add to workout» when it is opened
 * from «+ Exercise». In place of what was on the screen, not over it: the
 * picker and the workout are already in a sheet.
 */
export function ExerciseGuide({
  exercise,
  language,
  onBack,
  onAdd,
}: {
  exercise: GymExercise;
  language: Language;
  onBack: () => void;
  onAdd?: () => void;
}) {
  const guide = guideOf(exercise.key, language);
  const move = moveOf(exercise.key);
  const worked = musclesOf(exercise.key);
  return (
    <View style={styles.guide} testID={`guide-${exercise.key}`}>
      <View style={styles.top}>
        <Pressable
          style={gymStyles.chip}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t("Back")}
          testID="guide-back"
        >
          <Text style={gymStyles.chipText}>‹</Text>
        </Pressable>
        <View style={styles.titles}>
          <Text style={gymStyles.title} accessibilityRole="header">
            {exercise.names[language]}
          </Text>
          <Text style={gymStyles.muted}>{groupName(exercise.group, language)}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {move !== null && (
          <View style={styles.stage}>
            <View style={styles.pictures}>
              <ExerciseFigure
                move={move}
                size={GUIDE_FIGURE_SIZE}
                testID="guide-figure"
              />
              {worked !== null && (
                <MuscleMap
                  worked={worked}
                  height={GUIDE_BODY_HEIGHT}
                  language={language}
                  detail
                  labelled={false}
                  testID="guide-muscles"
                />
              )}
            </View>
            {worked !== null && (
              <MuscleCaption
                worked={worked}
                language={language}
                testID="guide-muscle-names"
              />
            )}
          </View>
        )}
        {guide !== null && (
          <>
            <Text style={styles.heading} accessibilityRole="header">
              {t("How to do it")}
            </Text>
            {guide.slice(0, 3).map((step, index) => (
              <View key={index} style={styles.step}>
                <View style={styles.number}>
                  <Text style={styles.numberText} importantForAccessibility="no">
                    {index + 1}
                  </Text>
                </View>
                <Text style={[gymStyles.text, styles.stepText]}>{step}</Text>
              </View>
            ))}
            <View style={styles.watch} accessible testID="guide-watch-out">
              <Text style={styles.watchTitle}>{`⚠︎ ${t("Watch out")}`}</Text>
              <Text style={gymStyles.text}>{guide[3]}</Text>
            </View>
          </>
        )}
        {onAdd !== undefined && (
          <Pressable
            style={[gymStyles.button, gymStyles.primary]}
            onPress={onAdd}
            accessibilityRole="button"
            testID="guide-add"
          >
            <Text style={[gymStyles.buttonText, gymStyles.primaryText]}>
              {t("Add to workout")}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const NUMBER_SIZE = 28;

const styles = StyleSheet.create({
  guide: {
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
  stage: {
    alignItems: "center",
    gap: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    paddingVertical: space.md,
  },
  // The bodies beside the figure; under it on a narrow screen.
  pictures: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
  },
  heading: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm,
  },
  number: {
    width: NUMBER_SIZE,
    height: NUMBER_SIZE,
    borderRadius: NUMBER_SIZE / 2,
    borderWidth: 1,
    borderColor: color.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    fontVariant: ["tabular-nums"],
  },
  stepText: {
    flex: 1,
    paddingTop: space.xs,
  },
  watch: {
    gap: space.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.warning,
    padding: space.md,
  },
  watchTitle: {
    color: color.warning,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
