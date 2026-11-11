import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SIGN_IN_TO_KEEP_RUNS, useActivitiesDoor } from "../activities/activitiesDoor";
import { useBody } from "../body/useBody";
import { healthPhone } from "../health/healthModules";
import type { HealthPhone } from "../health/healthPhone";
import { HealthRunEnd } from "../health/HealthRunEnd";
import { useHealth } from "../health/useHealth";
import { t } from "../i18n";
import { appLanguage } from "../i18n/language";
import { clockLabel } from "../navigation/freeRun";
import { color, fontSize, fontWeight, space } from "../theme/tokens";
import { useUnits } from "../units/useUnits";
import { countsLabel, restsLabel, rowsOf, setLabel } from "./ExerciseList";
import { ExercisePicker } from "./ExercisePicker";
import { type GymPost, GymPostForm, newGymPost } from "./GymPostForm";
import { saveGymToHealth } from "./gymHealth";
import { gymKcal, gymKcalLabel } from "./gymKcal";
import { gymStyles } from "./gymStyles";
import { SetFields, type SetTexts, textsOf, valuesOfTexts } from "./SetFields";
import type { PickPhoto } from "../social/PublicParts";
import { entryOf, type Entry, setOf, valuesOf } from "./setKinds";
import type { GymSaved } from "./useGymOutbox";
import { changeWorkout, endGymWorkout } from "./useWorkout";
import {
  activeMs,
  chooseExercise,
  deleteSet,
  editSet,
  logSet,
  savable,
  type LoggedSet,
  type Workout,
} from "./workout";
import { entryName } from "./WorkoutScreen";

type Editing = { kind: "set"; n: number; entry: Entry } | { kind: "new"; entry: Entry };

/**
 * The workout ended (TASK-385 part B): its time, its exercises and sets and
 * its rests; every set can be corrected or taken away, and one forgotten
 * added, before «Save» (the user's «Sì, così»); a set added now is not
 * «live». Under them the form of its post (TASK-385 part D, the user's
 * «Sì, anche alla fine»), as at the end of a run. «Save» keeps it on the
 * phone and sends it, its post after it, and writes it to Apple Health or
 * Health Connect after the user's yes (part C); «Discard» asks first.
 * Signed out, it says to sign in, as the end of a run does: `onSignIn` is
 * the way there of what shows it over the app (TASK-453). Its energy
 * under its time (part C, the user's «Stima MET sempre»).
 */
export function GymEnd({
  workout,
  onSave,
  onSignIn,
  pick,
  fetchFn,
  apiKey,
  health: phone = healthPhone(),
}: {
  workout: Workout;
  onSave: (workout: Workout, post?: GymPost) => GymSaved;
  /** «Sign up or log in», signed out; without it, the account's own door. */
  onSignIn?: () => void;
  /** The fakes of the tests: the photo picker, the fetch of the tag search. */
  pick?: PickPhoto;
  fetchFn?: typeof fetch;
  apiKey?: string | null;
  /** The phone's health data; for the tests, a fake. */
  health?: HealthPhone | null;
}) {
  const insets = useSafeAreaInsets();
  const units = useUnits();
  const { signedIn, signIn, owner } = useActivitiesDoor();
  const [post, setPost] = useState<GymPost>(() => newGymPost(owner));
  const [editing, setEditing] = useState<Editing | null>(null);
  const [texts, setTexts] = useState<SetTexts>({});
  const [picking, setPicking] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [problem, setProblem] = useState(false);
  const healthState = useHealth(phone);
  const body = useBody();

  function edit(set: LoggedSet) {
    const entry = entryOf(set);
    setEditing({ kind: "set", n: set.n, entry });
    setTexts(textsOf(entry, valuesOf(set), units));
  }

  function done() {
    if (editing === null) {
      return;
    }
    const values = valuesOfTexts(editing.entry, texts, units);
    const changed =
      editing.kind === "set"
        ? changeWorkout((going) => editSet(going, editing.n, values))
        : changeWorkout((going, at) =>
            logSet(chooseExercise(going, editing.entry, at), values, at),
          );
    if (changed) {
      setEditing(null);
    }
  }

  function save() {
    const saved = onSave(workout, post);
    if (saved === "kept") {
      // Written there, on the phone, with no network; never fails «Save».
      void saveGymToHealth(phone, workout);
      endGymWorkout();
    } else {
      setProblem(true);
    }
  }

  if (picking) {
    return (
      <View style={[gymStyles.screen, { paddingTop: insets.top + space.lg }]}>
        <ExercisePicker
          onPick={(entry) => {
            setPicking(false);
            setEditing({ kind: "new", entry });
            setTexts({});
          }}
          onClose={() => setPicking(false)}
        />
      </View>
    );
  }

  const rests = restsLabel({
    rests: workout.rests,
    rest_s: workout.restS,
    sets: workout.sets,
  });
  const typed =
    editing === null
      ? null
      : setOf(editing.entry, valuesOfTexts(editing.entry, texts, units), 0, true);
  const timeMs = activeMs(workout, workout.endedMs ?? workout.startedMs);
  const kcal = gymKcalLabel(
    gymKcal(
      workout.sets,
      timeMs / 1000,
      body,
      new Date(workout.startedMs).getFullYear(),
    ),
  );

  return (
    <View style={gymStyles.screen} testID="gym-end">
      <ScrollView
        contentContainerStyle={[
          gymStyles.content,
          {
            paddingTop: insets.top + space.lg,
            paddingBottom: insets.bottom + space.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.head}>
          <Text style={gymStyles.muted}>{`🏋️ ${t("Gym")}`}</Text>
          <Text style={styles.clock} testID="gym-end-time">
            {clockLabel(timeMs)}
          </Text>
          {kcal !== null && (
            <Text style={[gymStyles.muted, styles.energy]} testID="gym-end-kcal">
              {kcal}
            </Text>
          )}
        </View>
        {workout.sets.length > 0 && (
          <Text style={gymStyles.text}>
            {countsLabel(
              rowsOf(workout.sets, appLanguage()).length,
              workout.sets.length,
            )}
          </Text>
        )}
        {rests !== null && <Text style={gymStyles.muted}>{rests}</Text>}
        {editing !== null ? (
          <View style={styles.edit} testID="gym-edit">
            <Text style={gymStyles.title}>{entryName(editing.entry)}</Text>
            <SetFields
              entry={editing.entry}
              texts={texts}
              units={units}
              onChange={setTexts}
            />
            <View style={gymStyles.row}>
              {editing.kind === "set" && (
                <Pressable
                  style={gymStyles.button}
                  onPress={() => {
                    changeWorkout((going) => deleteSet(going, editing.n));
                    setEditing(null);
                  }}
                  accessibilityRole="button"
                  testID="delete-set"
                >
                  <Text style={[gymStyles.buttonText, gymStyles.danger]}>
                    {t("Delete")}
                  </Text>
                </Pressable>
              )}
              <Pressable
                style={[
                  gymStyles.button,
                  gymStyles.primary,
                  typed === null && gymStyles.disabled,
                ]}
                disabled={typed === null}
                onPress={done}
                accessibilityRole="button"
                testID="edit-done"
              >
                <Text style={[gymStyles.buttonText, gymStyles.primaryText]}>
                  {t("Done")}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.sets}>
              {workout.sets.map((set) => (
                <Pressable
                  key={set.n}
                  style={styles.setRow}
                  onPress={() => edit(set)}
                  accessibilityRole="button"
                  testID={`gym-set-${set.n}`}
                >
                  <Text style={gymStyles.text}>{entryName(entryOf(set))}</Text>
                  <Text style={gymStyles.muted}>{setLabel(set, units)}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={gymStyles.button}
              onPress={() => setPicking(true)}
              accessibilityRole="button"
            >
              <Text style={gymStyles.buttonText}>{t("+ Exercise")}</Text>
            </Pressable>
            {signedIn && (
              <GymPostForm
                post={post}
                onPost={setPost}
                pick={pick}
                fetchFn={fetchFn}
                apiKey={apiKey}
              />
            )}
            {phone !== null && signedIn && (
              <HealthRunEnd store={phone.store} health={healthState} />
            )}
          </>
        )}
        {problem && (
          <Text style={[gymStyles.muted, gymStyles.danger]}>
            {t("This run could not be kept on the phone. Try again.")}
          </Text>
        )}
        {!signedIn && (
          <Pressable onPress={onSignIn ?? signIn} accessibilityRole="button">
            <Text style={[gymStyles.text, styles.link]}>{t(SIGN_IN_TO_KEEP_RUNS)}</Text>
          </Pressable>
        )}
        {editing === null &&
          (discarding ? (
            <View style={gymStyles.row}>
              <Pressable
                style={gymStyles.button}
                onPress={() => setDiscarding(false)}
                accessibilityRole="button"
              >
                <Text style={gymStyles.buttonText}>{t("Keep it")}</Text>
              </Pressable>
              <Pressable
                style={gymStyles.button}
                onPress={endGymWorkout}
                accessibilityRole="button"
                testID="gym-discard-sure"
              >
                <Text style={[gymStyles.buttonText, gymStyles.danger]}>
                  {t("Discard")}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={gymStyles.row}>
              <Pressable
                style={gymStyles.button}
                onPress={() => setDiscarding(true)}
                accessibilityRole="button"
                testID="gym-discard"
              >
                <Text style={[gymStyles.buttonText, gymStyles.danger]}>
                  {t("Discard")}
                </Text>
              </Pressable>
              {signedIn && (
                <Pressable
                  style={[
                    gymStyles.button,
                    gymStyles.primary,
                    !savable(workout) && gymStyles.disabled,
                  ]}
                  disabled={!savable(workout)}
                  onPress={save}
                  accessibilityRole="button"
                  accessibilityLabel={t("Save to My activities")}
                  testID="gym-save"
                >
                  <Text style={[gymStyles.buttonText, gymStyles.primaryText]}>
                    {t("Save")}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // The calories, in red wherever they are (TASK-424 part C3).
  energy: {
    color: color.energy,
  },
  head: {
    alignItems: "center",
    gap: space.xs,
  },
  clock: {
    color: color.text,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  edit: {
    gap: space.md,
  },
  sets: {
    gap: space.xs,
  },
  setRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  link: {
    textDecorationLine: "underline",
  },
});
