import { Pressable, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import type { Language } from "../i18n/languages";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { GYM_EXERCISES, type GymExercise, type GymGroup } from "./catalog";
import { ExerciseFigure } from "./ExerciseFigure";
import { groupName, GYM_GROUPS } from "./groups";
import { MOVES, type MoveKey, moveOf } from "./moves";
import { MuscleMap } from "./MuscleMap";
import { musclesOf } from "./muscles";
import type { Entry } from "./setKinds";

/** The move on each group's tile (TASK-411 part E). */
export const GROUP_MOVE: Readonly<Record<GymGroup, MoveKey>> = {
  chest: "bench",
  back: "pulldown",
  legs: "squat",
  shoulders: "lateral_raise",
  arms: "curl",
  core: "crunch",
  full_body: "swing",
  cardio: "run",
};

/** The side of the figure on a group's tile and on an exercise's. */
const GROUP_FIGURE = 52;
const EXERCISE_FIGURE = 52;
/** The height of the body beside it, with the muscles worked (TASK-465). */
const EXERCISE_BODY = 48;

/** The sign of each group on its tile (TASK-411 part A, the user's «Gruppi,
 * poi macchinari»). */
export const GROUP_EMOJI: Readonly<Record<GymGroup, string>> = {
  chest: "🫁",
  back: "🧗",
  legs: "🦵",
  shoulders: "🤸",
  arms: "💪",
  core: "🧘",
  full_body: "🏋️",
  cardio: "🏃",
};

/** The exercises of `group`, in the catalog's order. */
export function exercisesOf(group: GymGroup): GymExercise[] {
  return GYM_EXERCISES.filter((exercise) => exercise.group === group);
}

/**
 * The eight groups of «+ Exercise» as big tiles, two a row (TASK-411 part
 * A, ADR-0341): the group's sign, its name and how many exercises it has.
 */
export function GroupGrid({
  language,
  onGroup,
}: {
  language: Language;
  onGroup: (group: GymGroup) => void;
}) {
  return (
    <View style={styles.grid} testID="group-grid">
      {GYM_GROUPS.map((group) => {
        const name = groupName(group, language);
        const count = exercisesOf(group).length;
        return (
          <Pressable
            key={group}
            style={({ pressed }) => [
              styles.tile,
              styles.group,
              pressed && styles.pressed,
            ]}
            onPress={() => onGroup(group)}
            accessibilityRole="button"
            accessibilityLabel={`${name}, ${count}`}
            testID={`group-${group}`}
          >
            <View style={styles.groupWords}>
              <Text style={styles.emoji} importantForAccessibility="no">
                {GROUP_EMOJI[group]}
              </Text>
              <Text style={styles.name} numberOfLines={2}>
                {name}
              </Text>
              <Text style={styles.count} importantForAccessibility="no">
                {count}
              </Text>
            </View>
            <ExerciseFigure move={MOVES[GROUP_MOVE[group]]} size={GROUP_FIGURE} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** «ⓘ» beside an exercise: its guide, «How to do it» to the screen reader. */
export function GuideButton({
  exercise,
  language,
  onGuide,
}: {
  exercise: GymExercise;
  language: Language;
  onGuide: (exercise: GymExercise) => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.info, pressed && styles.pressed]}
      onPress={() => onGuide(exercise)}
      accessibilityRole="button"
      accessibilityLabel={`${t("How to do it")}: ${exercise.names[language]}`}
      hitSlop={space.sm}
      testID={`guide-open-${exercise.key}`}
    >
      <Text style={styles.infoText}>i</Text>
    </Pressable>
  );
}

/**
 * The exercises of one group as tiles, two a row (TASK-411 parts A and E):
 * the figure doing it beside its name; a tile picks it, its «ⓘ» opens the
 * guide.
 */
export function MachineGrid({
  group,
  language,
  onPick,
  onGuide,
}: {
  group: GymGroup;
  language: Language;
  onPick: (entry: Entry) => void;
  onGuide: (exercise: GymExercise) => void;
}) {
  return (
    <View style={styles.grid} testID={`machine-grid-${group}`}>
      {exercisesOf(group).map((exercise) => {
        const move = moveOf(exercise.key);
        const worked = musclesOf(exercise.key);
        return (
          <View key={exercise.key} style={[styles.tile, styles.machine]}>
            <Pressable
              style={({ pressed }) => [styles.machinePick, pressed && styles.pressed]}
              onPress={() => onPick({ exercise: exercise.key, kind: exercise.kind })}
              accessibilityRole="button"
              testID={`exercise-${exercise.key}`}
            >
              <View style={styles.pictures}>
                {move !== null && <ExerciseFigure move={move} size={EXERCISE_FIGURE} />}
                {worked !== null && (
                  <MuscleMap
                    worked={worked}
                    height={EXERCISE_BODY}
                    language={language}
                  />
                )}
              </View>
              <Text style={styles.machineName} numberOfLines={3}>
                {exercise.names[language]}
              </Text>
            </Pressable>
            <View style={styles.corner}>
              <GuideButton exercise={exercise} language={language} onGuide={onGuide} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** The round «ⓘ» of a tile: small to see, with `hitSlop` to tap. */
const INFO_SIZE = 26;

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    padding: space.md,
  },
  group: {
    minHeight: MIN_TAP_SIZE * 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.xs,
  },
  groupWords: {
    flex: 1,
    gap: space.xs,
  },
  machine: {
    minHeight: MIN_TAP_SIZE + space.lg,
    padding: 0,
    overflow: "hidden",
  },
  machinePick: {
    flex: 1,
    alignItems: "center",
    gap: space.xs,
    padding: space.sm,
    paddingTop: space.md,
  },
  pictures: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  corner: {
    position: "absolute",
    top: space.xs,
    right: space.xs,
  },
  info: {
    width: INFO_SIZE,
    height: INFO_SIZE,
    borderRadius: INFO_SIZE / 2,
    borderWidth: 1,
    borderColor: color.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surface,
  },
  infoText: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    fontStyle: "italic",
  },
  pressed: {
    opacity: 0.7,
  },
  emoji: {
    fontSize: fontSize.title,
  },
  name: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  count: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontVariant: ["tabular-nums"],
  },
  machineName: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    textAlign: "center",
  },
});
