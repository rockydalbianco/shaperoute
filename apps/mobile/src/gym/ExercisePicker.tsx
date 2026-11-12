import type { GymSetKind } from "@shaperoute/shared-types";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { t } from "../i18n";
import { appLanguage } from "../i18n/language";
import type { Language } from "../i18n/languages";
import { color, space } from "../theme/tokens";
import { GYM_EXERCISES, type GymExercise, type GymGroup } from "./catalog";
import { ExerciseFigure } from "./ExerciseFigure";
import { GroupGrid, GuideButton, MachineGrid } from "./ExerciseGrid";
import { ExerciseGuide } from "./ExerciseGuide";
import { groupName } from "./groups";
import { gymStyles } from "./gymStyles";
import { moveOf } from "./moves";
import { MuscleMap } from "./MuscleMap";
import { musclesOf } from "./muscles";
import type { Entry } from "./setKinds";

/** The side of the figure on a row of the search. */
const ROW_FIGURE = 40;

/** The longest name the API keeps for an exercise of one's own. */
export const MAX_NAME = 40;

/** Lower case and without accents, to find «Développé» typing «develop». */
function plain(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** The exercises of `group` (all, with null) whose name in `language`, or
 * in English, has `search` in it, in the catalog's order. */
export function exercisesFound(
  search: string,
  group: GymGroup | null,
  language: Language,
): GymExercise[] {
  const wanted = plain(search);
  return GYM_EXERCISES.filter(
    (exercise) =>
      (group === null || exercise.group === group) &&
      (wanted === "" ||
        plain(exercise.names[language]).includes(wanted) ||
        plain(exercise.names.en).includes(wanted)),
  );
}

/** The kinds one's own exercise may be, with the words of its fields. */
const OWN_KINDS: readonly GymSetKind[] = ["load", "bodyweight", "timed", "cardio"];

function kindName(kind: GymSetKind, language: Language): string {
  switch (kind) {
    case "load":
      return t("Weight");
    case "bodyweight":
      return t("Reps");
    case "timed":
      return t("Time");
    case "cardio":
      return groupName("cardio", language);
  }
}

/**
 * «+ Exercise» (TASK-385 part B, the user's «Sì, così»): the catalog by
 * group, a search, and «Add “{name}”» for one it has not, with the kind
 * chosen by whoever writes it (by the words of its fields: weight, reps,
 * time, cardio). The groups are a grid of tiles, then the group's
 * exercises a grid too (TASK-411 part A, the user's «Gruppi, poi
 * macchinari»); typing searches every group, as a list. Each exercise has
 * its figure moving beside its name and «ⓘ» for its guide (part E, the
 * user's «Omino nell'app»).
 */
export function ExercisePicker({
  onPick,
  onClose,
}: {
  onPick: (entry: Entry) => void;
  onClose: () => void;
}) {
  const language = appLanguage();
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<GymGroup | null>(null);
  const [own, setOwn] = useState<string | null>(null);
  const [guide, setGuide] = useState<GymExercise | null>(null);
  // Typing searches every group, as a list; otherwise the grids.
  const searching = search.trim() !== "";
  const found = exercisesFound(search, null, language);
  const name = search.trim().slice(0, MAX_NAME);
  const exact = found.some(
    (exercise) => plain(exercise.names[language]) === plain(name),
  );

  if (guide !== null) {
    return (
      <View style={[gymStyles.content, styles.picker]}>
        <ExerciseGuide
          exercise={guide}
          language={language}
          onBack={() => setGuide(null)}
          onAdd={() => onPick({ exercise: guide.key, kind: guide.kind })}
        />
      </View>
    );
  }

  if (own !== null) {
    return (
      <View style={gymStyles.content} testID="own-exercise">
        <Text style={gymStyles.title}>{own}</Text>
        <View style={styles.wrap}>
          {OWN_KINDS.map((kind) => (
            <Pressable
              key={kind}
              style={gymStyles.chip}
              onPress={() => onPick({ name: own, kind })}
              accessibilityRole="button"
              testID={`own-kind-${kind}`}
            >
              <Text style={gymStyles.chipText}>{kindName(kind, language)}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={gymStyles.button}
          onPress={() => setOwn(null)}
          accessibilityRole="button"
        >
          <Text style={gymStyles.buttonText}>{t("Back")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[gymStyles.content, styles.picker]} testID="exercise-picker">
      <View style={styles.top}>
        <TextInput
          style={[gymStyles.input, styles.search]}
          value={search}
          onChangeText={setSearch}
          placeholder={t("Search exercises")}
          placeholderTextColor={color.textFaint}
          accessibilityLabel={t("Search exercises")}
          autoCorrect={false}
          testID="exercise-search"
        />
        <Pressable style={gymStyles.chip} onPress={onClose} accessibilityRole="button">
          <Text style={gymStyles.chipText}>{t("Close")}</Text>
        </Pressable>
      </View>
      {!searching && group !== null && (
        <View style={styles.top}>
          <Pressable
            style={gymStyles.chip}
            onPress={() => setGroup(null)}
            accessibilityRole="button"
            accessibilityLabel={t("Back")}
            testID="groups-back"
          >
            <Text style={gymStyles.chipText}>‹</Text>
          </Pressable>
          <Text style={gymStyles.title} accessibilityRole="header">
            {groupName(group, language)}
          </Text>
        </View>
      )}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
      >
        {!searching &&
          (group === null ? (
            <GroupGrid language={language} onGroup={setGroup} />
          ) : (
            <MachineGrid
              group={group}
              language={language}
              onPick={onPick}
              onGuide={setGuide}
            />
          ))}
        {searching && name !== "" && !exact && (
          <Pressable
            style={styles.row}
            onPress={() => setOwn(name)}
            accessibilityRole="button"
            testID="add-own-exercise"
          >
            <Text style={gymStyles.text}>{t("Add “{name}”", { name })}</Text>
          </Pressable>
        )}
        {searching &&
          found.map((exercise) => {
            const move = moveOf(exercise.key);
            const worked = musclesOf(exercise.key);
            return (
              <View key={exercise.key} style={styles.found}>
                <Pressable
                  style={styles.foundPick}
                  onPress={() =>
                    onPick({ exercise: exercise.key, kind: exercise.kind })
                  }
                  accessibilityRole="button"
                  testID={`exercise-${exercise.key}`}
                >
                  {move !== null && <ExerciseFigure move={move} size={ROW_FIGURE} />}
                  {worked !== null && (
                    <MuscleMap
                      worked={worked}
                      height={ROW_FIGURE}
                      language={language}
                    />
                  )}
                  <Text style={[gymStyles.text, styles.foundName]}>
                    {exercise.names[language]}
                  </Text>
                </Pressable>
                <GuideButton
                  exercise={exercise}
                  language={language}
                  onGuide={setGuide}
                />
              </View>
            );
          })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  picker: {
    flex: 1,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  search: {
    flex: 1,
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  list: {
    paddingBottom: space.xxl,
  },
  row: {
    minHeight: 48,
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  found: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  foundPick: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.xs,
  },
  foundName: {
    flex: 1,
  },
});
