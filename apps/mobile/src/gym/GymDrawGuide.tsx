import type {
  GymCalendar,
  GymCalendarWorkout,
  GymPlanItem,
} from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useActivitiesDoor } from "../activities/activitiesDoor";
import { dayLabel } from "../activities/activityText";
import { fetchGymCalendar, phoneTimeZone } from "../api/gymCalendar";
import { t, tLater } from "../i18n";
import type { Language } from "../i18n/languages";
import { useLanguage } from "../i18n/useLanguage";
import { clockLabel } from "../navigation/freeRun";
import { useFollowsDoor } from "../social/followsDoor";
import {
  color,
  font,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { exerciseName } from "./catalog";
import { GymCalendarSheet } from "./GymCalendar";
import { closeGymIntro, showGymIntro, useGymIntro } from "./gymIntro";
import { GymIntroSheet } from "./GymIntroSheet";
import { WEEK_DAYS } from "./planLimits";
import { GymPlansSheet } from "./GymPlans";
import { isoDay, todayPlan, useGymPlans } from "./plans";
import { goToRun, RUN_HINTS, runAmount, runTitle } from "./runDay";
import { startGymWorkout } from "./useWorkout";

/** The three steps of «How it works» (texts approved on 2026-11-06). */
export const GUIDE_STEPS = [
  tLater("Pick an exercise from the grid"),
  tLater("Log each set: the rest starts by itself"),
  tLater("«Save»: calories, milestones and leaderboard"),
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** «Today», «Yesterday» or the day, on the phone's clock. */
export function whenLabel(startedAt: string, now: Date = new Date()): string {
  const when = new Date(startedAt);
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (when.getTime() >= midnight.getTime()) {
    return t("Today");
  }
  if (when.getTime() >= midnight.getTime() - DAY_MS) {
    return t("Yesterday");
  }
  return dayLabel(startedAt);
}

/** «Last workout: Yesterday · 55:00». */
export function lastLine(workout: GymCalendarWorkout, now: Date = new Date()): string {
  return t("Last workout: {when} · {time}", {
    when: whenLabel(workout.started_at, now),
    time: clockLabel(workout.duration_s * 1000),
  });
}

/** «This month: 3 times». */
export function monthLine(count: number): string {
  return count === 1
    ? t("This month: 1 time")
    : t("This month: {n} times", { n: String(count) });
}

/** «Bench press 4×8»: an exercise of a plan, its sets and what each aims at. */
export function planItemLine(item: GymPlanItem, language: Language): string {
  const name = exerciseName(
    item.exercise !== undefined
      ? { exercise: item.exercise }
      : { name: item.name ?? "" },
    language,
  );
  const each =
    item.reps !== undefined
      ? String(item.reps)
      : item.duration_s !== undefined
        ? clockLabel(item.duration_s * 1000)
        : "";
  return `${name} ${item.sets}×${each}`;
}

/** «2 plans», «1 plan». */
export function plansCount(count: number): string {
  return count === 1 ? t("1 plan") : t("{n} plans", { n: String(count) });
}

/**
 * The gym in Draw (TASK-411 B, C and F, ADR-0341, the user's «Sì, così» of
 * 2026-11-08): one card with one yellow button. With a plan for today,
 * «Today · Mon», the plan, its exercises and «Start “Push”», which follows
 * it, and «Start without the plan»; without one, «Start workout» and «New
 * plan». Under it two tiles: the month (how many workouts, the last one),
 * which opens the calendar, and the plans. «How it works» in three steps
 * until the first workout is saved. The calendar is asked again when the
 * account's activities change: a workout just saved counts.
 */
export function GymDrawGuide({
  onStart,
  startLabel,
  startIcon,
  hint,
  fetchFn,
}: {
  /** «Start workout» of Draw: today's plan when there is one. */
  onStart?: () => void;
  startLabel?: string;
  startIcon?: string;
  /** The line under the title without a plan. */
  hint?: string;
  fetchFn?: typeof fetch;
}) {
  const { apiUrl, account } = useFollowsDoor();
  const { total } = useActivitiesDoor();
  const language = useLanguage();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const [calendar, setCalendar] = useState<GymCalendar | null>(null);
  const [open, setOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  // «New plan» opens the editor straight away, not the empty list.
  const [newPlan, setNewPlan] = useState(false);
  const { owner, plans } = useGymPlans(fetchFn);
  const today = todayPlan(plans);
  // «Your plan, step by step»: up the first time «Gym» is touched (TASK-433
  // B); «Create my plan» opens the guide once the sheet is down.
  const intro = useGymIntro();
  const [createAfterIntro, setCreateAfterIntro] = useState(false);

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

  const shown = token === null ? null : calendar;
  // Once a workout is saved, the steps have done their job.
  const firstTime = shown === null || shown.last === null;
  const start = startLabel ?? t("Start workout");

  function startButton(label: string, testID: string) {
    return (
      <Pressable
        style={({ pressed }) => [styles.start, pressed && styles.pressed]}
        onPress={onStart}
        accessibilityRole="button"
        accessibilityLabel={label}
        testID={testID}
      >
        {startIcon !== undefined && (
          <Text style={styles.startText} importantForAccessibility="no">
            {startIcon}
          </Text>
        )}
        <Text style={styles.startText}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.page} testID="gym-guide">
      {today !== null ? (
        <View style={styles.box} testID="gym-guide-today">
          <View style={styles.todayTop}>
            <Text style={styles.label}>
              {`${t("Today")} · ${t(WEEK_DAYS[isoDay(new Date()) - 1])}`}
            </Text>
            {today.week !== null && today.weeks !== null && (
              <Text style={styles.label} testID="gym-guide-week">
                {t("Week {n} of {total}", {
                  n: String(today.week),
                  total: String(today.weeks),
                })}
              </Text>
            )}
          </View>
          {today.run !== undefined ? (
            <>
              <View style={styles.runHead}>
                <Text style={styles.runMark} importantForAccessibility="no">
                  RUN
                </Text>
                <View style={styles.runText}>
                  <Text style={styles.title} accessibilityRole="header">
                    {runTitle(today.run)}
                  </Text>
                  <Text style={styles.muted}>{today.plan}</Text>
                </View>
              </View>
              <Text style={styles.muted}>{t(RUN_HINTS[today.run.kind])}</Text>
              <Pressable
                style={({ pressed }) => [styles.start, pressed && styles.pressed]}
                onPress={() => today.run !== undefined && goToRun(today.run)}
                accessibilityRole="button"
                testID="gym-guide-go-run"
              >
                <Text style={styles.startText}>
                  {t("Go to the run · {amount}", { amount: runAmount(today.run) })}
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.link, pressed && styles.pressed]}
                onPress={() => startGymWorkout(Date.now(), null)}
                accessibilityRole="button"
                testID="gym-guide-free"
              >
                <Text style={styles.muted}>{t("Gym today instead")}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.title} accessibilityRole="header">
                {today.name}
              </Text>
              {today.plan !== today.name && (
                <Text style={styles.muted}>{today.plan}</Text>
              )}
              <View style={styles.chips}>
                {today.items.map((item, index) => (
                  <Text key={index} style={styles.chip}>
                    {planItemLine(item, language)}
                  </Text>
                ))}
              </View>
              {startButton(t("Start “{plan}”", { plan: today.name }), "run-no-route")}
              <Pressable
                style={({ pressed }) => [styles.link, pressed && styles.pressed]}
                onPress={() => startGymWorkout(Date.now(), null)}
                accessibilityRole="button"
                testID="gym-guide-free"
              >
                <Text style={styles.muted}>{t("Start without the plan")}</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : (
        <View style={styles.box} testID="record-day">
          {startButton(start, "run-no-route")}
          {hint !== undefined && <Text style={styles.muted}>{hint}</Text>}
          {owner !== null && (
            <Pressable
              style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
              onPress={() => {
                setNewPlan(true);
                setPlansOpen(true);
              }}
              accessibilityRole="button"
              testID="gym-guide-new-plan"
            >
              <Text style={styles.ghostText}>{`📋 ${t("New plan")}`}</Text>
            </Pressable>
          )}
        </View>
      )}
      {(shown !== null || (owner !== null && plans.length > 0)) && (
        <View style={styles.tiles}>
          {shown !== null && (
            <Pressable
              style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
              onPress={() => setOpen(true)}
              accessibilityRole="button"
              testID="gym-guide-month"
            >
              <Text style={styles.label}>{`📅 ${t("Gym calendar")}`}</Text>
              <Text style={styles.tileValue}>{monthLine(shown.count)}</Text>
              {shown.last !== null && (
                <Text style={styles.muted} testID="gym-guide-last">
                  {lastLine(shown.last)}
                </Text>
              )}
            </Pressable>
          )}
          {owner !== null && plans.length > 0 && (
            <Pressable
              style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
              onPress={() => setPlansOpen(true)}
              accessibilityRole="button"
              testID="gym-guide-plans"
            >
              <Text style={styles.label}>{`📋 ${t("Plans")}`}</Text>
              <Text style={styles.tileValue}>{plansCount(plans.length)}</Text>
            </Pressable>
          )}
        </View>
      )}
      <Pressable
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}
        onPress={showGymIntro}
        accessibilityRole="button"
        testID="gym-guide-intro"
      >
        <Text style={[styles.muted, styles.underline]}>{t("How plans work")}</Text>
      </Pressable>
      {firstTime && (
        <View style={styles.box} testID="gym-guide-steps">
          <Text style={styles.stepsTitle} accessibilityRole="header">
            {t("How it works")}
          </Text>
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
        </View>
      )}
      <GymCalendarSheet
        visible={open}
        onClose={() => setOpen(false)}
        fetchFn={fetchFn}
      />
      <GymIntroSheet
        visible={intro}
        onCreate={
          owner === null
            ? null
            : () => {
                setCreateAfterIntro(true);
                closeGymIntro();
              }
        }
        onClose={closeGymIntro}
        onHidden={() => {
          if (createAfterIntro) {
            setCreateAfterIntro(false);
            setNewPlan(true);
            setPlansOpen(true);
          }
        }}
      />
      <GymPlansSheet
        visible={plansOpen}
        startNew={newPlan}
        onClose={() => {
          setPlansOpen(false);
          setNewPlan(false);
        }}
        fetchFn={fetchFn}
      />
    </View>
  );
}

const NUMBER_SIZE = 24;

const styles = StyleSheet.create({
  page: {
    gap: space.md,
  },
  box: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  runHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  runMark: {
    width: 52,
    height: 52,
    lineHeight: 52,
    textAlign: "center",
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: color.surfaceRaised,
    color: color.runDay,
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
  },
  runText: {
    flex: 1,
    gap: 2,
  },
  todayTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.sm,
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  title: {
    ...font.heading,
    color: color.text,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.xs,
  },
  chip: {
    color: color.text,
    fontSize: fontSize.small,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
    overflow: "hidden",
  },
  start: {
    minHeight: MIN_TAP_SIZE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    borderRadius: radius.pill,
    backgroundColor: color.accent,
  },
  startText: {
    color: color.onAccent,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  link: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  ghost: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  ghostText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  pressed: {
    opacity: 0.7,
  },
  tiles: {
    flexDirection: "row",
    gap: space.sm,
  },
  tile: {
    flex: 1,
    gap: space.xs,
    minHeight: MIN_TAP_SIZE * 2,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  tileValue: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  stepsTitle: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
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
    color: color.text,
    fontSize: fontSize.body,
  },
  underline: {
    textDecorationLine: "underline",
  },
  muted: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
});
