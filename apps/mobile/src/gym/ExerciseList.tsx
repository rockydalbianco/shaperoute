import type { GymExercises, GymSet } from "@shaperoute/shared-types";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { weightLabel } from "../body/bodyUnits";
import { t, tPlural } from "../i18n";
import { appLanguage } from "../i18n/language";
import type { Language } from "../i18n/languages";
import { clockLabel } from "../navigation/freeRun";
import { color, font, fontWeight, space } from "../theme/tokens";
import { distanceLabel } from "../units/format";
import { useUnits } from "../units/useUnits";
import type { Units } from "../units/units";
import { exerciseName } from "./catalog";
import { hasLeaderboard } from "./Leaderboard";

type Props = {
  exercises: GymExercises;
  /** An exercise with a leaderboard touched (part F): its key. None, the
   * names are only words. */
  onExercise?: (exercise: string) => void;
};

/** One exercise and its sets, in the order it was first done. */
export type ExerciseRow = { name: string; sets: GymSet[] };

/** The sets of a workout, each exercise once with its sets in order. An
 * exercise done again later stays in its first place. */
export function rowsOf(sets: readonly GymSet[], language: Language): ExerciseRow[] {
  const rows: ExerciseRow[] = [];
  const byKey = new Map<string, ExerciseRow>();
  for (const set of sets) {
    const key = set.exercise ?? `name:${set.name ?? ""}`;
    let row = byKey.get(key);
    if (row === undefined) {
      row = { name: exerciseName(set, language), sets: [] };
      byKey.set(key, row);
      rows.push(row);
    }
    row.sets.push(set);
  }
  return rows;
}

/** One set as it is read: «80 kg × 5», «×12», «+10 kg × 8», «1:30»,
 * «10:00 · 1.60 km». A dumbbell's kg is per hand, as it was typed. */
export function setLabel(set: GymSet, units: Units): string {
  switch (set.kind) {
    case "load":
      return `${weightLabel(set.load_kg ?? 0, units)} × ${set.reps ?? 0}`;
    case "bodyweight":
      return set.load_kg === undefined || set.load_kg === 0
        ? `×${set.reps ?? 0}`
        : `+${weightLabel(set.load_kg, units)} × ${set.reps ?? 0}`;
    case "timed":
      return clockLabel((set.duration_s ?? 0) * 1000);
    case "cardio": {
      const time = clockLabel((set.duration_s ?? 0) * 1000);
      return set.distance_m === undefined || set.distance_m === 0
        ? time
        : `${time} · ${distanceLabel(set.distance_m, units)}`;
    }
  }
}

/** «8 exercises · 10 sets», and «1 exercise · 1 set» (TASK-453). */
export function countsLabel(exercises: number, sets: number): string {
  return `${tPlural(exercises, "{count} exercise", "{count} exercises")} · ${tPlural(
    sets,
    "{count} set",
    "{count} sets",
  )}`;
}

/** «6 rests · avg 1:30 · 9:00 resting», «1 rest · …»; null without rests. */
export function restsLabel(exercises: GymExercises): string | null {
  if (exercises.rests === 0) {
    return null;
  }
  return `${tPlural(exercises.rests, "{count} rest", "{count} rests")} · ${t(
    "avg {time} · {total} resting",
    {
      time: clockLabel((exercises.rest_s / exercises.rests) * 1000),
      total: clockLabel(exercises.rest_s * 1000),
    },
  )}`;
}

/**
 * The exercises on the post of a workout at the gym (TASK-385 B0, ADR-0327):
 * how many and how many sets, then each exercise by name in the app's
 * language with its sets, and the rests the timer counted. Loads in kg or
 * lb as «Settings» says. The texts are the user's, approved on 2026-11-04.
 * With `onExercise`, the name of one with a leaderboard opens it (part F).
 */
export function ExerciseList({ exercises, onExercise }: Props) {
  const units = useUnits();
  const rows = rowsOf(exercises.sets, appLanguage());
  if (rows.length === 0) {
    return null;
  }
  const rests = restsLabel(exercises);
  return (
    <View style={styles.list} testID="gym-exercises">
      <Text style={styles.title} accessibilityRole="header">
        {countsLabel(rows.length, exercises.sets.length)}
      </Text>
      {rows.map((row, n) => {
        const key = row.sets[0]?.exercise;
        const opens = onExercise !== undefined && hasLeaderboard(key);
        return (
          <View key={n} style={styles.row}>
            {opens ? (
              <Pressable
                onPress={() => onExercise(key)}
                accessibilityRole="button"
                hitSlop={space.sm}
                testID={`gym-exercise-${key}`}
              >
                <Text style={[styles.name, styles.link]}>{`${row.name} ›`}</Text>
              </Pressable>
            ) : (
              <Text style={styles.name}>{row.name}</Text>
            )}
            <Text style={styles.sets}>
              {row.sets.map((set) => setLabel(set, units)).join(" · ")}
            </Text>
          </View>
        );
      })}
      {rests !== null && <Text style={styles.rests}>{rests}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.sm,
  },
  title: {
    ...font.body,
    color: color.text,
    fontWeight: fontWeight.medium,
  },
  row: {
    gap: space.xs,
  },
  name: {
    ...font.body,
    color: color.text,
  },
  link: {
    fontWeight: fontWeight.semibold,
  },
  sets: {
    ...font.small,
    color: color.textMuted,
  },
  rests: {
    ...font.small,
    color: color.textMuted,
  },
});
