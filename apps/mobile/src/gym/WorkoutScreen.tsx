import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBody } from "../body/useBody";
import { t } from "../i18n";
import { appLanguage } from "../i18n/language";
import { LiveShareButton } from "../liveShare/LiveShareButton";
import { useLiveShareNumbers } from "../liveShare/useLiveShareNumbers";
import { clockLabel } from "../navigation/freeRun";
import { useRunAwake } from "../navigation/useRunAwake";
import { HoldButton } from "../screens/HoldButton";
import { color, fontSize, fontWeight, MIN_TAP_SIZE, space } from "../theme/tokens";
import { useUnits } from "../units/useUnits";
import { exerciseName, gymExercise } from "./catalog";
import { ExerciseFigure } from "./ExerciseFigure";
import { GuideButton } from "./ExerciseGrid";
import { ExerciseGuide } from "./ExerciseGuide";
import { planItemLine } from "./GymDrawGuide";
import { ExerciseList } from "./ExerciseList";
import { ExercisePicker } from "./ExercisePicker";
import { gymKcal, gymKcalLabel } from "./gymKcal";
import { gymLiveStats } from "./gymLive";
import { gymStyles } from "./gymStyles";
import { moveOf } from "./moves";
import { useRestAlert } from "./restAlert";
import { RestPanel } from "./RestPanel";
import { restOver } from "./restTimer";
import { SetFields, type SetTexts, textsOf, valuesOfTexts } from "./SetFields";
import { type Entry, sameEntry, type SetValues, setOf } from "./setKinds";
import { StillTraining } from "./StillTraining";
import { changeWorkout } from "./useWorkout";
import {
  activeMs,
  chooseExercise,
  finishWorkout,
  isPaused,
  logSet,
  nextSetNumber,
  pauseWorkout,
  planProgress,
  planStep,
  planTarget,
  restNow,
  resumeWorkout,
  sameAgainValues,
  setsOf,
  shiftWorkoutRest,
  skipRest,
  stillAsking,
  stillTraining,
  type Workout,
} from "./workout";

/** The name of what `entry` is, in the app's language. */
export function entryName(entry: Entry): string {
  return exerciseName(
    "exercise" in entry ? { exercise: entry.exercise } : { name: entry.name },
    appLanguage(),
  );
}

/** «Next: {exercise} · set {n}», for the rest and its notification. */
export function nextLabel(workout: Workout): string | null {
  return workout.current === null
    ? null
    : t("Next: {exercise} · set {n}", {
        exercise: entryName(workout.current),
        n: String(nextSetNumber(workout)),
      });
}

/**
 * A workout at the gym while it lasts (TASK-385 part B, the user's choices
 * of 2026-11-04): the time without the pauses, the exercise being done
 * with the boxes of its next set, «Log set» and «Same again», «+ Exercise»,
 * the rest after each set, the sets so far, «Pause» and «Stop» to hold.
 * A set or a rest ends a «Pause»; the clock runs through the rests. The
 * screen stays on while a rest counts down. «Share live» (TASK-424 part
 * B2): the link shows the time, the exercise in progress and the calories,
 * with no map.
 */
export function WorkoutScreen({
  workout,
  nowMs,
  fetchFn,
  apiKey,
}: {
  workout: Workout;
  nowMs: number;
  /** For the tests: the fetch and the API key of «Share live». */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
}) {
  const insets = useSafeAreaInsets();
  const units = useUnits();
  const body = useBody();
  const [picking, setPicking] = useState(workout.current === null);
  // The guide of the exercise under way, in place of the workout (part E).
  const [guiding, setGuiding] = useState(false);
  // What the boxes of a set hold first: the last set of the exercise, or
  // what the plan aims at (TASK-411 C), or nothing.
  function startTexts(going: Workout, entry: Entry): SetTexts {
    const last = setsOf(going, entry).at(-1);
    if (last !== undefined) {
      return textsOf(entry, last, units);
    }
    const target = planTarget(going, entry);
    return target === null ? {} : textsOf(entry, target, units);
  }
  const [texts, setTexts] = useState<SetTexts>(() =>
    workout.current === null ? {} : startTexts(workout, workout.current),
  );

  // A set logged; when the plan moves on to its next exercise, its boxes
  // hold what the plan aims at.
  function log(values: SetValues) {
    const moved: { to: Workout | null } = { to: null };
    changeWorkout((going, at) => {
      const after = logSet(going, values, at);
      if (
        after?.current != null &&
        going.current !== null &&
        !sameEntry(after.current, going.current)
      ) {
        moved.to = after;
      }
      return after;
    });
    if (moved.to?.current != null) {
      setTexts(startTexts(moved.to, moved.to.current));
    }
  }
  const paused = isPaused(workout);
  const rest =
    workout.rest !== null && !restOver(workout.rest, nowMs) ? workout.rest : null;
  const next = nextLabel(workout);
  useRestAlert(rest, next);
  useRunAwake(rest !== null);
  // No watch follows a workout at the gym yet: no live heart rate to send.
  const liveNumbers = useCallback(
    (atMs: number) => gymLiveStats(workout, atMs, body, entryName, null),
    [workout, body],
  );
  useLiveShareNumbers(liveNumbers, paused);

  const current = workout.current;
  const typed =
    current === null
      ? null
      : setOf(current, valuesOfTexts(current, texts, units), 0, true);
  const again = sameAgainValues(workout);

  function pick(entry: Entry) {
    changeWorkout((going, at) => chooseExercise(going, entry, at));
    setTexts(startTexts(workout, entry));
    setPicking(false);
  }

  if (picking) {
    return (
      <View style={[gymStyles.screen, { paddingTop: insets.top + space.lg }]}>
        <ExercisePicker onPick={pick} onClose={() => setPicking(false)} />
      </View>
    );
  }

  const language = appLanguage();
  const guided =
    current !== null && "exercise" in current
      ? gymExercise(current.exercise)
      : undefined;
  const move = guided === undefined ? null : moveOf(guided.key);
  if (guiding && guided !== undefined) {
    return (
      <View style={[gymStyles.screen, { paddingTop: insets.top + space.lg }]}>
        <View style={[gymStyles.content, styles.guide]}>
          <ExerciseGuide
            exercise={guided}
            language={language}
            onBack={() => setGuiding(false)}
          />
        </View>
      </View>
    );
  }

  const done = workout.sets.length > 0;
  const progress = planProgress(workout);
  const step = planStep(workout);
  // Its energy so far (part C, the user's «Stima MET sempre»).
  const timeMs = activeMs(workout, nowMs);
  const kcal = gymKcalLabel(
    gymKcal(
      workout.sets,
      timeMs / 1000,
      body,
      new Date(workout.startedMs).getFullYear(),
    ),
  );
  return (
    <View style={gymStyles.screen} testID="gym-workout">
      <ScrollView
        contentContainerStyle={[
          gymStyles.content,
          { paddingTop: insets.top + space.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.head}>
          <Text style={gymStyles.muted}>{`🏋️ ${t("Gym")}`}</Text>
          <Text style={styles.clock} accessibilityRole="timer" testID="gym-clock">
            {clockLabel(timeMs)}
          </Text>
          {kcal !== null && (
            <Text style={[gymStyles.muted, styles.energy]} testID="gym-kcal">
              {kcal}
            </Text>
          )}
          {progress !== null && (
            <View style={styles.bar} importantForAccessibility="no-hide-descendants">
              <View
                style={[
                  styles.barDone,
                  {
                    width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%`,
                  },
                ]}
              />
            </View>
          )}
          {progress !== null && (
            <Text style={gymStyles.muted} testID="plan-progress">
              {`${workout.plan?.name ?? ""} · ${t("Plan: {done}/{total} sets", {
                done: String(progress.done),
                total: String(progress.total),
              })}`}
            </Text>
          )}
          {paused && <Text style={gymStyles.muted}>{t("Paused")}</Text>}
          <LiveShareButton
            canStart={workout.endedMs === null}
            trackless={{ activity: "gym" }}
            fetchFn={fetchFn}
            apiKey={apiKey}
          />
        </View>
        {stillAsking(workout, nowMs) && (
          <StillTraining
            onYes={() => changeWorkout((going, at) => stillTraining(going, at))}
            onFinish={() => changeWorkout((going, at) => finishWorkout(going, at))}
          />
        )}
        {rest !== null && (
          <RestPanel
            rest={rest}
            nowMs={nowMs}
            next={next}
            onShift={(delta) =>
              changeWorkout((going, at) => shiftWorkoutRest(going, delta, at))
            }
            onSkip={() => changeWorkout((going, at) => skipRest(going, at))}
            onChoose={(seconds) =>
              changeWorkout((going, at) => restNow(going, seconds, at))
            }
          />
        )}
        {current !== null && (
          <View style={styles.set} testID="gym-set">
            <View style={styles.name}>
              {move !== null && <ExerciseFigure move={move} size={NAME_FIGURE} />}
              <Text style={[gymStyles.title, styles.nameText]}>
                {entryName(current)}
              </Text>
              {guided !== undefined && (
                <GuideButton
                  exercise={guided}
                  language={language}
                  onGuide={() => setGuiding(true)}
                />
              )}
            </View>
            {step === null ? (
              <Text style={gymStyles.muted}>
                {t("Set {n}", { n: String(nextSetNumber(workout)) })}
              </Text>
            ) : (
              <View style={styles.step} testID="plan-step">
                <Text style={gymStyles.muted}>
                  {t("Set {n} of {total}", {
                    n: String(step.set),
                    total: String(step.sets),
                  })}
                </Text>
                <View
                  style={styles.dots}
                  importantForAccessibility="no-hide-descendants"
                >
                  {Array.from({ length: step.sets }, (_, i) => (
                    <View
                      key={i}
                      style={[styles.dot, i < step.set - 1 && styles.dotDone]}
                    />
                  ))}
                </View>
              </View>
            )}
            <SetFields
              entry={current}
              texts={texts}
              units={units}
              onChange={setTexts}
            />
            <Pressable
              style={[
                gymStyles.button,
                gymStyles.primary,
                styles.log,
                typed === null && gymStyles.disabled,
              ]}
              disabled={typed === null}
              onPress={() => log(valuesOfTexts(current, texts, units))}
              accessibilityRole="button"
              testID="log-set"
            >
              <Text style={[gymStyles.buttonText, gymStyles.primaryText]}>
                {`✓ ${t("Log set")}`}
              </Text>
            </Pressable>
            <Pressable
              style={[gymStyles.button, again === null && gymStyles.disabled]}
              disabled={again === null}
              onPress={() => {
                if (again !== null) {
                  setTexts(textsOf(current, again, units));
                  log(again);
                }
              }}
              accessibilityRole="button"
              testID="same-again"
            >
              <Text style={gymStyles.buttonText}>{t("Same again")}</Text>
            </Pressable>
          </View>
        )}
        {step?.then != null && (
          <Text style={gymStyles.muted} testID="plan-then">
            {t("Then: {exercise}", {
              exercise: planItemLine(step.then, language),
            })}
          </Text>
        )}
        <Pressable
          style={[gymStyles.button, current === null && gymStyles.primary]}
          onPress={() => setPicking(true)}
          accessibilityRole="button"
          testID="add-exercise"
        >
          <Text
            style={[gymStyles.buttonText, current === null && gymStyles.primaryText]}
          >
            {t("+ Exercise")}
          </Text>
        </Pressable>
        {done && (
          <ExerciseList
            exercises={{
              rests: workout.rests,
              rest_s: workout.restS,
              sets: workout.sets,
            }}
          />
        )}
      </ScrollView>
      <View style={[styles.foot, { paddingBottom: insets.bottom + space.md }]}>
        <Pressable
          style={gymStyles.button}
          onPress={() =>
            changeWorkout((going, at) =>
              paused ? resumeWorkout(going, at) : pauseWorkout(going, at),
            )
          }
          accessibilityRole="button"
          testID="gym-pause"
        >
          <Text style={gymStyles.buttonText}>{paused ? t("Resume") : t("Pause")}</Text>
        </Pressable>
        <HoldButton
          onHeld={() => changeWorkout((going, at) => finishWorkout(going, at))}
        />
      </View>
    </View>
  );
}

/** The side of the figure beside the exercise under way. */
const NAME_FIGURE = 48;
/** The dots of the plan's sets and the bar of its progress (part F). */
const DOT = 10;
const BAR = 6;

const styles = StyleSheet.create({
  // The calories, in red wherever they are (TASK-424 part C3).
  energy: {
    color: color.energy,
  },
  guide: {
    flex: 1,
  },
  name: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  nameText: {
    flex: 1,
  },
  step: {
    gap: space.xs,
  },
  dots: {
    flexDirection: "row",
    gap: space.xs,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: color.surfaceRaised,
  },
  dotDone: {
    backgroundColor: color.accent,
  },
  log: {
    minHeight: MIN_TAP_SIZE + space.md,
  },
  bar: {
    alignSelf: "stretch",
    height: BAR,
    borderRadius: BAR / 2,
    backgroundColor: color.surfaceRaised,
    overflow: "hidden",
  },
  barDone: {
    height: BAR,
    backgroundColor: color.accent,
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
  set: {
    gap: space.md,
  },
  foot: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
});
