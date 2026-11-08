import type { GymCalendar, GymCalendarWorkout } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useActivitiesDoor } from "../activities/activitiesDoor";
import { dayLabel } from "../activities/activityText";
import { fetchGymCalendar, phoneTimeZone } from "../api/gymCalendar";
import { t, tLater } from "../i18n";
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
import { GymCalendarSheet } from "./GymCalendar";
import { GymPlansSheet } from "./GymPlans";
import { todayPlan, useGymPlans } from "./plans";
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

/**
 * Under «Start workout» in Draw (TASK-411 B, ADR-0341, the user's «3 passi
 * + ultimo allenamento»): «How it works» in three steps; under them, for
 * who is signed in, the last workout and how many this month, which opens
 * the calendar. An API without the calendar shows the steps alone. Asked
 * again when the account's activities change: a workout just saved counts.
 * With a plan for today (part C), «Today: {plan}», which «Start workout»
 * follows, and «Start without the plan»; «Plans» lists and writes them.
 */
export function GymDrawGuide({ fetchFn }: { fetchFn?: typeof fetch }) {
  const { apiUrl, account } = useFollowsDoor();
  const { total } = useActivitiesDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const [calendar, setCalendar] = useState<GymCalendar | null>(null);
  const [open, setOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const { owner, plans } = useGymPlans(fetchFn);
  const today = todayPlan(plans);

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
  return (
    <View style={styles.box} testID="gym-guide">
      <Text style={styles.title} accessibilityRole="header">
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
      {today !== null && (
        <View style={styles.history}>
          <Text style={styles.monthText} testID="gym-guide-today">
            {t("Today: {plan}", { plan: today.name })}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.month, pressed && styles.pressed]}
            onPress={() => startGymWorkout(Date.now(), null)}
            accessibilityRole="button"
            testID="gym-guide-free"
          >
            <Text style={styles.muted}>{t("Start without the plan")}</Text>
          </Pressable>
        </View>
      )}
      {shown !== null && (
        <View style={styles.history}>
          {shown.last !== null && (
            <Text style={styles.muted} testID="gym-guide-last">
              {lastLine(shown.last)}
            </Text>
          )}
          <Pressable
            style={({ pressed }) => [styles.month, pressed && styles.pressed]}
            onPress={() => setOpen(true)}
            accessibilityRole="button"
            testID="gym-guide-month"
          >
            <Text style={styles.monthText}>{`${monthLine(shown.count)} ›`}</Text>
          </Pressable>
        </View>
      )}
      {owner !== null && (
        <Pressable
          style={({ pressed }) => [styles.month, pressed && styles.pressed]}
          onPress={() => setPlansOpen(true)}
          accessibilityRole="button"
          testID="gym-guide-plans"
        >
          <Text style={styles.monthText}>{`${t("Plans")} ›`}</Text>
        </Pressable>
      )}
      <GymCalendarSheet
        visible={open}
        onClose={() => setOpen(false)}
        fetchFn={fetchFn}
      />
      <GymPlansSheet
        visible={plansOpen}
        onClose={() => setPlansOpen(false)}
        fetchFn={fetchFn}
      />
    </View>
  );
}

const NUMBER_SIZE = 24;

const styles = StyleSheet.create({
  box: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  title: {
    ...font.heading,
    color: color.text,
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
  history: {
    gap: space.xs,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  muted: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  month: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  monthText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
