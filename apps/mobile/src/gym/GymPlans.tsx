import type { GymPlan } from "@shaperoute/shared-types";
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
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { GymPlanEditor, WEEK_DAYS } from "./GymPlanEditor";
import { gymStyles } from "./gymStyles";
import { useGymPlans } from "./plans";

/** At most this many plans an account keeps (gym_plans.py). */
export const MAX_PLANS = 20;

/** «Mon · Thu · 3 exercises»: a plan's days and how many exercises. */
export function planLine(plan: Pick<GymPlan, "days" | "items">): string {
  const days = plan.days.map((day) => t(WEEK_DAYS[day - 1]));
  const count =
    plan.items.length === 1
      ? t("1 exercise")
      : t("{n} exercises", { n: String(plan.items.length) });
  return [...days, count].join(" · ");
}

/**
 * «Plans» over the whole screen (TASK-411 C, ADR-0341, the user's «Schede
 * + giorni»): one's own plans in their order, each with its days and how
 * many exercises; a plan opens its editor, «New plan» writes one. Kept on
 * the phone and on the account, seen only by their owner.
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
  // The plan being written: «new», a plan's key, or none (the list).
  const [editing, setEditing] = useState<string | null>(startNew ? "new" : null);
  const page = {
    paddingTop: insets.top + space.lg,
    paddingBottom: insets.bottom + space.lg,
  };

  if (editing !== null) {
    const plan = plans.find((one) => one.key === editing) ?? null;
    return (
      <View style={[styles.screen, page]} testID="gym-plan">
        <Text style={styles.title} accessibilityRole="header">
          {plan?.name ?? t("New plan")}
        </Text>
        <GymPlanEditor
          plan={plan}
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
          onBack={() => setEditing(null)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, page]} testID="gym-plans">
      <Text style={styles.title} accessibilityRole="header">
        {t("Plans")}
      </Text>
      <ScrollView contentContainerStyle={styles.list}>
        {plans.map((plan) => (
          <Pressable
            key={plan.key}
            style={({ pressed }) => [styles.plan, pressed && styles.pressed]}
            onPress={() => setEditing(plan.key)}
            accessibilityRole="button"
            testID="gym-plan-row"
          >
            <Text style={styles.name}>{plan.name}</Text>
            <Text style={gymStyles.muted}>{planLine(plan)}</Text>
          </Pressable>
        ))}
        {plans.length < MAX_PLANS && (
          <Pressable
            style={[gymStyles.button, gymStyles.primary]}
            onPress={() => setEditing("new")}
            accessibilityRole="button"
            testID="gym-plan-new"
          >
            <Text style={[gymStyles.buttonText, gymStyles.primaryText]}>
              {t("New plan")}
            </Text>
          </Pressable>
        )}
      </ScrollView>
      <Pressable
        style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        onPress={onClose}
        accessibilityRole="button"
        testID="gym-plans-close"
      >
        <Text style={styles.closeText}>{t("Close")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: space.md,
    paddingHorizontal: space.lg,
    backgroundColor: color.background,
  },
  title: {
    color: color.text,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    textAlign: "center",
  },
  list: {
    gap: space.sm,
    paddingBottom: space.lg,
  },
  plan: {
    gap: space.xs,
    minHeight: MIN_TAP_SIZE,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  name: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  close: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  closeText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
