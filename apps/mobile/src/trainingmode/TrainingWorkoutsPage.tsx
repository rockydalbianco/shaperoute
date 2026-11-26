import type {
  GymCalendar,
  GymCalendarWorkout,
  GymPlan,
} from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useActivitiesDoor } from "../activities/activitiesDoor";
import { fetchGymCalendar, phoneTimeZone } from "../api/gymCalendar";
import { exerciseName } from "../gym/catalog";
import { historyKey } from "../gym/exerciseHistory";
import { ExerciseHistory } from "../gym/ExerciseHistoryPage";
import { ExercisePicker } from "../gym/ExercisePicker";
import { GymCalendarSheet } from "../gym/GymCalendar";
import { GUIDE_STEPS, lastLine, monthLine, whenLabel } from "../gym/GymDrawGuide";
import { showGymIntro } from "../gym/gymIntro";
import { GymPlansSheet, planLine } from "../gym/GymPlans";
import { gymStyles } from "../gym/gymStyles";
import { useGymPlans } from "../gym/plans";
import type { Entry } from "../gym/setKinds";
import { useExerciseHistory } from "../gym/useExerciseHistory";
import { t } from "../i18n";
import { useLanguage } from "../i18n/useLanguage";
import { clockLabel } from "../navigation/freeRun";
import { useFollowsDoor } from "../social/followsDoor";
import { useHeaderScroll, useUnderHeader } from "../tabs/headerScroll";
import { useTabBarRoom } from "../tabs/tabBarRoom";
import { color, font, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { Hairline } from "../ui/Hairline";
import { Tap } from "../ui/Tap";
import { useUnits } from "../units/useUnits";

/** The workouts of the month, the latest first. */
export function workoutsOf(calendar: GymCalendar): GymCalendarWorkout[] {
  return calendar.days
    .flatMap((day) => day.workouts)
    .sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at));
}

/** The exercises of `plans`, once each, in the order they come. */
export function planEntries(plans: readonly Pick<GymPlan, "items">[]): Entry[] {
  const seen = new Set<string>();
  const entries: Entry[] = [];
  for (const plan of plans) {
    for (const item of plan.items) {
      const entry: Entry =
        item.exercise !== undefined
          ? { exercise: item.exercise, kind: item.kind }
          : { name: item.name ?? "", kind: item.kind };
      if ("name" in entry && entry.name.trim() === "") {
        continue;
      }
      const key = historyKey(entry);
      if (!seen.has(key)) {
        seen.add(key);
        entries.push(entry);
      }
    }
  }
  return entries;
}

/** «Yesterday · Push · 55:00»: a workout of the month. */
export function workoutLine(
  workout: GymCalendarWorkout,
  now: Date = new Date(),
): string {
  const name = workout.plan ?? t("Workout at the gym");
  return `${whenLabel(workout.started_at, now)} · ${name} · ${clockLabel(
    workout.duration_s * 1000,
  )}`;
}

type Props = {
  /** No account: a touch on «Log in» goes to «Profile». */
  onLogIn: () => void;
  fetchFn?: typeof fetch;
};

/**
 * «Workouts», the second page of the training mode (TASK-490 part A,
 * ADR-0398): the plans (they open «My plans»), the month (it opens the
 * gym calendar), the workouts done this month and the history of every
 * exercise of the plans, or of any other found in the catalog. All of it
 * is what the gym already had, in one page; nothing of it is kept here.
 * At the end «How it works» (part E): the three steps and «How plans
 * work», which «Today» no longer shows (the user's choice of 2026-11-24).
 */
export function TrainingWorkoutsPage({ onLogIn, fetchFn }: Props) {
  const { apiUrl, account } = useFollowsDoor();
  const { total } = useActivitiesDoor();
  const { owner, plans } = useGymPlans(fetchFn);
  const language = useLanguage();
  const headerScroll = useHeaderScroll();
  // Under a floating header the page goes on showing behind it (TASK-469 B3).
  const underHeader = useUnderHeader();
  const barRoom = useTabBarRoom();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const [calendar, setCalendar] = useState<GymCalendar | null>(null);
  const [plansOpen, setPlansOpen] = useState(false);
  const [newPlan, setNewPlan] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [finding, setFinding] = useState(false);
  const [opened, setOpened] = useState<Entry | null>(null);

  useEffect(() => {
    if (apiUrl === null || token === null) {
      return;
    }
    let live = true;
    void fetchGymCalendar(apiUrl, token, phoneTimeZone(), null, { fetchFn }).then(
      (outcome) => {
        if (live) {
          setCalendar(outcome.kind === "ok" ? outcome.value : null);
        }
      },
    );
    return () => {
      live = false;
    };
  }, [apiUrl, token, total, fetchFn]);

  const signedIn = token !== null && owner !== null;
  const shown = token === null ? null : calendar;
  const done = shown === null ? [] : workoutsOf(shown);
  const entries = planEntries(plans);

  return (
    <View style={styles.page}>
      <ScrollView
        {...headerScroll}
        style={[styles.page, underHeader]}
        contentContainerStyle={[styles.content, { paddingBottom: space.xxl + barRoom }]}
        testID="training-workouts"
      >
        <Text style={styles.title} accessibilityRole="header">
          {t("Workouts")}
        </Text>
        {!signedIn ? (
          <View style={styles.empty}>
            <Text style={styles.line}>
              {t("Log in to keep your plans and see your workouts.")}
            </Text>
            <Tap
              style={styles.button}
              onPress={onLogIn}
              accessibilityRole="button"
              testID="training-log-in"
            >
              <Text style={styles.buttonText}>{t("Log in")}</Text>
            </Tap>
          </View>
        ) : (
          <>
            <Text style={styles.label} accessibilityRole="header">
              {t("My plans")}
            </Text>
            <View style={styles.card}>
              {plans.map((plan, at) => (
                <View key={plan.key}>
                  {at > 0 && <Hairline style={styles.inset} />}
                  <Tap
                    style={styles.row}
                    onPress={() => setPlansOpen(true)}
                    accessibilityRole="button"
                    testID={`training-plan-${plan.key}`}
                  >
                    <Text style={styles.name}>{plan.name}</Text>
                    <Text style={styles.small}>{planLine(plan)}</Text>
                  </Tap>
                </View>
              ))}
              {plans.length > 0 && <Hairline style={styles.inset} />}
              <Tap
                style={styles.row}
                onPress={() => {
                  setNewPlan(true);
                  setPlansOpen(true);
                }}
                accessibilityRole="button"
                testID="training-new-plan"
              >
                <Text style={styles.name}>{`📋 ${t("New plan")}`}</Text>
              </Tap>
            </View>

            <Text style={styles.label} accessibilityRole="header">
              {t("This month")}
            </Text>
            <View style={styles.card}>
              <Tap
                style={styles.row}
                onPress={() => setMonthOpen(true)}
                accessibilityRole="button"
                testID="training-month"
              >
                <Text style={styles.name}>{`📅 ${t("Gym calendar")}`}</Text>
                {shown !== null && (
                  <Text style={styles.small}>{monthLine(shown.count)}</Text>
                )}
                {shown?.last != null && (
                  <Text style={styles.small}>{lastLine(shown.last)}</Text>
                )}
              </Tap>
              {done.map((workout) => (
                <View key={workout.id}>
                  <Hairline style={styles.inset} />
                  <View style={styles.row} testID={`training-done-${workout.id}`}>
                    <Text style={styles.name}>{workoutLine(workout)}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={styles.label} accessibilityRole="header">
              {t("Exercises")}
            </Text>
            <View style={styles.card}>
              {entries.map((entry) => (
                <View key={historyKey(entry)}>
                  <Tap
                    style={styles.row}
                    onPress={() => setOpened(entry)}
                    accessibilityRole="button"
                    testID={`training-exercise-${historyKey(entry)}`}
                  >
                    <Text style={styles.name}>{exerciseName(entry, language)}</Text>
                  </Tap>
                  <Hairline style={styles.inset} />
                </View>
              ))}
              <Tap
                style={styles.row}
                onPress={() => setFinding(true)}
                accessibilityRole="button"
                testID="training-find-exercise"
              >
                <Text style={styles.name}>{`🔍 ${t("Find an exercise")}`}</Text>
              </Tap>
            </View>
          </>
        )}

        <Text style={styles.label} accessibilityRole="header">
          {t("How it works")}
        </Text>
        <View style={[styles.card, styles.steps]} testID="training-how">
          {GUIDE_STEPS.map((step, index) => (
            <View key={step} style={styles.step}>
              <View style={styles.number}>
                <Text style={styles.numberText} importantForAccessibility="no">
                  {index + 1}
                </Text>
              </View>
              <Text style={styles.stepText}>{t(step)}</Text>
            </View>
          ))}
          <Tap
            style={styles.link}
            onPress={showGymIntro}
            accessibilityRole="button"
            testID="training-how-plans"
          >
            <Text style={[styles.small, styles.underline]}>{t("How plans work")}</Text>
          </Tap>
        </View>
      </ScrollView>
      <GymPlansSheet
        visible={plansOpen}
        startNew={newPlan}
        onClose={() => {
          setPlansOpen(false);
          setNewPlan(false);
        }}
        fetchFn={fetchFn}
      />
      <GymCalendarSheet
        visible={monthOpen}
        onClose={() => setMonthOpen(false)}
        fetchFn={fetchFn}
      />
      <Modal
        visible={finding || opened !== null}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          setFinding(false);
          setOpened(null);
        }}
      >
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <HistoryLayer
            entry={opened}
            finding={finding}
            onPick={(entry) => {
              setFinding(false);
              setOpened(entry);
            }}
            onClose={() => {
              setFinding(false);
              setOpened(null);
            }}
            fetchFn={fetchFn}
          />
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}

/** Over the whole screen: the catalog to find an exercise, or the history
 * of the one opened (ADR-0392), «‹» back to «Workouts». */
function HistoryLayer({
  entry,
  finding,
  onPick,
  onClose,
  fetchFn,
}: {
  entry: Entry | null;
  finding: boolean;
  onPick: (entry: Entry) => void;
  onClose: () => void;
  fetchFn?: typeof fetch;
}) {
  const insets = useSafeAreaInsets();
  const language = useLanguage();
  const units = useUnits();
  const history = useExerciseHistory(entry, fetchFn);
  const [openedMs] = useState(() => Date.now());
  return (
    <View style={[gymStyles.screen, { paddingTop: insets.top + space.lg }]}>
      {finding ? (
        <ExercisePicker onPick={onPick} onClose={onClose} />
      ) : entry !== null ? (
        <ScrollView contentContainerStyle={gymStyles.content}>
          <ExerciseHistory
            title={exerciseName(entry, language)}
            state={history}
            units={units}
            nowMs={openedMs}
            onBack={onClose}
          />
        </ScrollView>
      ) : null}
    </View>
  );
}

/** The round number of a step, as in the guide of «Draw». */
const NUMBER_SIZE = 24;

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: color.background,
  },
  content: {
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xxl,
  },
  title: {
    ...font.title,
    color: color.text,
  },
  label: {
    ...font.label,
    color: color.textMuted,
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  inset: {
    marginHorizontal: space.md,
  },
  row: {
    minHeight: MIN_TAP_SIZE + space.md,
    justifyContent: "center",
    gap: space.xs / 2,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  name: {
    ...font.body,
    color: color.text,
  },
  small: {
    ...font.small,
    color: color.textMuted,
  },
  empty: {
    gap: space.md,
    paddingTop: space.md,
  },
  line: {
    ...font.body,
    color: color.textMuted,
  },
  button: {
    minHeight: MIN_TAP_SIZE,
    alignSelf: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  buttonText: {
    ...font.body,
    color: color.text,
  },
  steps: {
    gap: space.sm,
    padding: space.md,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  number: {
    width: NUMBER_SIZE,
    height: NUMBER_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: NUMBER_SIZE / 2,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  numberText: {
    ...font.small,
    color: color.text,
  },
  stepText: {
    ...font.body,
    flex: 1,
    color: color.text,
  },
  link: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
  },
  underline: {
    textDecorationLine: "underline",
  },
});
