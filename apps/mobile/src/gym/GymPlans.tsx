import type { GymPlan, GymProgram } from "@shaperoute/shared-types";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { t } from "../i18n";
import {
  color,
  font,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { WEEK_DAYS } from "./planLimits";
import { GymPlanWizard, type WizardStep } from "./GymPlanWizard";
import { gymStyles } from "./gymStyles";
import { isoDay, useGymPlans } from "./plans";
import { cycleWeekOf, sessionsOfWeek } from "./program";
import { gymIndex, isRunDay, sessionLetter } from "./proposal";

/** At most this many plans an account keeps (gym_plans.py). */
export const MAX_PLANS = 20;

/** «Mon · Thu · 3 exercises»: a plan's days and how many exercises
 * (without them for a plan with weeks). */
export function planLine(plan: Pick<GymPlan, "days" | "items">, count = true): string {
  const days = plan.days.map((day) => t(WEEK_DAYS[day - 1]));
  if (!count) {
    return days.join(" · ");
  }
  const exercises =
    plan.items.length === 1
      ? t("1 exercise")
      : t("{n} exercises", { n: String(plan.items.length) });
  return [...days, exercises].join(" · ");
}

/**
 * «My plans» over the whole screen (TASK-411 C, ADR-0341; the guide of
 * 2026-11-10): one's own plans in their order; a plan with weeks as a card
 * with the week it is in and this week's workouts, the others as a row;
 * each opens in the guide, «New guided plan» makes one. Kept on the phone
 * and on the account, seen only by their owner.
 */
export function GymPlansSheet({
  visible,
  onClose,
  fetchFn,
  startNew = false,
}: {
  visible: boolean;
  onClose: () => void;
  fetchFn?: typeof fetch;
  /** Open on a new plan's editor; back from it, the list (TASK-411 F). */
  startNew?: boolean;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Over the whole screen: the Pager's pages have no top edge of their own. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        {visible && (
          <PlansPage onClose={onClose} fetchFn={fetchFn} startNew={startNew} />
        )}
      </SafeAreaProvider>
    </Modal>
  );
}

function PlansPage({
  onClose,
  fetchFn,
  startNew,
}: {
  onClose: () => void;
  fetchFn?: typeof fetch;
  startNew: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { plans, keep, drop } = useGymPlans(fetchFn);
  // The plan in the guide: «new», a plan's key, or none (the list); and
  // the step it opens on.
  const [editing, setEditing] = useState<{ key: string; at: WizardStep } | null>(
    startNew ? { key: "new", at: "goal" } : null,
  );
  const page = {
    paddingTop: insets.top + space.lg,
    paddingBottom: insets.bottom + space.lg,
  };
  const today = new Date();

  if (editing !== null) {
    const plan = plans.find((one) => one.key === editing.key) ?? null;
    return (
      <View style={[styles.screen, page]} testID="gym-plan">
        <GymPlanWizard
          plan={plan}
          startAt={plan === null ? "goal" : editing.at}
          onSave={(draft) => {
            keep(plan === null ? null : plan.key, draft);
            setEditing(null);
          }}
          onDelete={
            plan === null
              ? undefined
              : () => {
                  drop(plan.key);
                  setEditing(null);
                }
          }
          onClose={() =>
            startNew && plans.length === 0 ? onClose() : setEditing(null)
          }
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, page]} testID="gym-plans">
      <View style={styles.top}>
        <Text style={styles.title} accessibilityRole="header">
          {t("My plans")}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("Close")}
          testID="gym-plans-close"
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {plans.map((plan) =>
          plan.program != null ? (
            <ProgramCard
              key={plan.key}
              plan={plan}
              program={plan.program}
              today={today}
              onEdit={(at) => setEditing({ key: plan.key, at })}
            />
          ) : (
            <Pressable
              key={plan.key}
              style={({ pressed }) => [styles.plan, pressed && styles.pressed]}
              onPress={() => setEditing({ key: plan.key, at: "plan" })}
              accessibilityRole="button"
              testID="gym-plan-row"
            >
              <View style={styles.planText}>
                <Text style={styles.name}>{plan.name}</Text>
                <Text style={gymStyles.muted}>
                  {`${planLine(plan)} · ${t("always the same")}`}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ),
        )}
      </ScrollView>
      {plans.length < MAX_PLANS && (
        <Pressable
          style={({ pressed }) => [
            plans.length === 0 ? styles.newFirst : styles.newMore,
            pressed && styles.pressed,
          ]}
          onPress={() => setEditing({ key: "new", at: "goal" })}
          accessibilityRole="button"
          testID="gym-plan-new"
        >
          <Text style={plans.length === 0 ? styles.newFirstText : styles.newMoreText}>
            {`+  ${t("New guided plan")}`}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/** A plan with weeks: its name, the week it is in and the cycle as
 * dashes, this week's workouts on their days (today ringed), «Edit» and
 * «Weeks». */
function ProgramCard({
  plan,
  program,
  today,
  onEdit,
}: {
  plan: GymPlan;
  program: GymProgram;
  today: Date;
  onEdit: (at: WizardStep) => void;
}) {
  const where = cycleWeekOf(program, today);
  const week = where?.week ?? 1;
  const sessions = sessionsOfWeek(program, week, where?.cycle ?? 0);
  const todayDay = isoDay(today);
  // A, B, C… for the gym's days, «RUN» for a run day (TASK-433 C).
  const letters = new Map(
    program.sessions.map((session) => [
      session.day,
      isRunDay(session)
        ? "RUN"
        : sessionLetter(gymIndex(program.sessions, session.day)),
    ]),
  );
  return (
    <View style={styles.program} testID="gym-plan-program">
      <View style={styles.programTop}>
        {where !== null ? (
          <Text style={styles.badge}>{t("In progress").toUpperCase()}</Text>
        ) : (
          <Text style={styles.badgeQuiet}>
            {t("From {day}", { day: program.starts_on.split("-").reverse().join("/") })}
          </Text>
        )}
        {program.weeks > 1 && (
          <Text style={gymStyles.muted}>
            {t("Week {n} of {total}", {
              n: String(week),
              total: String(program.weeks),
            })}
          </Text>
        )}
      </View>
      <View style={styles.planText}>
        <Text style={styles.programName}>{plan.name}</Text>
        <Text style={gymStyles.muted}>
          {planLine({ days: plan.days, items: [] }, false)}
        </Text>
      </View>
      {program.weeks > 1 && (
        <View style={styles.dashes} accessibilityElementsHidden>
          {Array.from({ length: program.weeks }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dash,
                i < week - 1 && styles.dashDone,
                i === week - 1 && where !== null && styles.dashNow,
              ]}
            />
          ))}
        </View>
      )}
      <View style={styles.days}>
        {WEEK_DAYS.map((day, index) => {
          const number = index + 1;
          const session = sessions.find((one) => one.day === number);
          const isToday = number === todayDay && where !== null;
          return (
            <View key={day} style={styles.dayColumn}>
              <Text style={[styles.dayName, isToday && styles.dayNameToday]}>
                {t(day).slice(0, 1)}
              </Text>
              {session !== undefined ? (
                <View
                  style={[
                    styles.dayDot,
                    session.run !== undefined && styles.dayDotRun,
                    number < todayDay && where !== null && styles.dayDotPast,
                    isToday && styles.dayDotToday,
                  ]}
                  accessibilityLabel={`${t(day)}: ${session.name}`}
                >
                  <Text
                    style={[
                      styles.dayLetter,
                      session.run !== undefined && styles.dayLetterRun,
                      number < todayDay && where !== null && styles.dayLetterPast,
                    ]}
                  >
                    {letters.get(number) ?? "•"}
                  </Text>
                </View>
              ) : (
                <View style={styles.dayEmpty} />
              )}
            </View>
          );
        })}
      </View>
      <View style={gymStyles.row}>
        <Pressable
          style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
          onPress={() => onEdit("plan")}
          accessibilityRole="button"
          testID="gym-plan-edit"
        >
          <Text style={styles.ghostText}>{t("Edit")}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
          onPress={() => onEdit("weeks")}
          accessibilityRole="button"
          testID="gym-plan-weeks"
        >
          <Text style={styles.ghostText}>{t("Weeks")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const DOT = 32;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: space.md,
    paddingHorizontal: space.lg,
    backgroundColor: color.background,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: color.text,
    fontSize: 28,
    lineHeight: 33,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
  },
  list: {
    gap: space.md,
    paddingBottom: space.lg,
  },
  plan: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: MIN_TAP_SIZE,
    padding: space.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  planText: {
    flex: 1,
    gap: space.xs,
  },
  chevron: {
    color: color.textFaint,
    fontSize: fontSize.heading,
  },
  pressed: {
    opacity: 0.7,
  },
  name: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  program: {
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.sheet,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  programTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    ...font.label,
    color: color.onAccent,
    backgroundColor: color.accent,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  badgeQuiet: {
    ...font.label,
    color: color.textMuted,
  },
  programName: {
    color: color.text,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: fontWeight.bold,
  },
  dashes: {
    flexDirection: "row",
    gap: 6,
  },
  dash: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: color.surfaceRaised,
  },
  dashDone: {
    backgroundColor: color.accent,
  },
  dashNow: {
    backgroundColor: color.accent,
    opacity: 0.55,
  },
  days: {
    flexDirection: "row",
  },
  dayColumn: {
    flex: 1,
    alignItems: "center",
    gap: space.xs,
  },
  dayName: {
    ...font.detail,
    color: color.textMuted,
  },
  dayNameToday: {
    color: color.text,
    fontWeight: fontWeight.bold,
  },
  dayDot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: color.border,
  },
  dayDotPast: {
    borderColor: color.accent,
    backgroundColor: color.accent,
  },
  dayDotToday: {
    borderWidth: 2,
    borderColor: color.accent,
  },
  dayEmpty: {
    width: DOT,
    height: DOT,
  },
  dayLetter: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
  },
  dayDotRun: {
    borderColor: color.runDay,
  },
  dayLetterRun: {
    color: color.runDay,
    fontSize: fontSize.label,
  },
  dayLetterPast: {
    color: color.onAccent,
  },
  ghost: {
    flex: 1,
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
  close: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: MIN_TAP_SIZE / 2,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  closeText: {
    color: color.text,
    fontSize: fontSize.body,
  },
  newFirst: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.accent,
  },
  newFirstText: {
    color: color.onAccent,
    fontSize: 17,
    fontWeight: fontWeight.bold,
  },
  newMore: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  newMoreText: {
    color: color.text,
    fontSize: 17,
    fontWeight: fontWeight.bold,
  },
});
