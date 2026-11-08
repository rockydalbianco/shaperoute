import { Pressable, StyleSheet, Text, View } from "react-native";

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
import { groupName, GYM_GROUPS } from "./groups";
import type { Entry } from "./setKinds";

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
            <Text style={styles.emoji} importantForAccessibility="no">
              {GROUP_EMOJI[group]}
            </Text>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.count} importantForAccessibility="no">
              {count}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The exercises of one group as tiles, two a row: a tile picks it. */
export function MachineGrid({
  group,
  language,
  onPick,
}: {
  group: GymGroup;
  language: Language;
  onPick: (entry: Entry) => void;
}) {
  return (
    <View style={styles.grid} testID={`machine-grid-${group}`}>
      {exercisesOf(group).map((exercise) => (
        <Pressable
          key={exercise.key}
          style={({ pressed }) => [
            styles.tile,
            styles.machine,
            pressed && styles.pressed,
          ]}
          onPress={() => onPick({ exercise: exercise.key, kind: exercise.kind })}
          accessibilityRole="button"
          testID={`exercise-${exercise.key}`}
        >
          <Text style={styles.machineName} numberOfLines={3}>
            {exercise.names[language]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

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
    justifyContent: "center",
    gap: space.xs,
  },
  machine: {
    minHeight: MIN_TAP_SIZE + space.lg,
    justifyContent: "center",
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
  },
});
