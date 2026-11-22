import type { GymPlanPosted } from "@shaperoute/shared-types";
import { type ReactNode, useMemo } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { planPostKeyOf } from "../api/planPosts";
import { GymPlanWizard } from "../gym/GymPlanWizard";
import { gymStyles } from "../gym/gymStyles";
import { planFromPosted } from "../gym/planCopy";
import { useGymPlans } from "../gym/plans";
import { t } from "../i18n";
import { useLanguage } from "../i18n/useLanguage";
import { color, font, fontWeight, MIN_TAP_SIZE, space } from "../theme/tokens";
import { usePlanPostOutbox } from "./PlanPostFlow";
import {
  planItemText,
  planSports,
  planTitle,
  planWeekLine,
  postedSessions,
  sessionHeading,
} from "./PlanPostTile";

/**
 * A gym plan posted, opened whole (TASK-485 part B, ADR-0394, the user's
 * «Riquadro + dettaglio» and «Anche i kg» of 2026-11-21): each workout of
 * its first week with its exercises, sets and kg, «A · Mon — Bench press
 * 4 × 10 · 60 kg», the runs and days out by name, «Thu — Long run · 8 km»,
 * and «Use this plan» at the foot, but not on one's own post: there,
 * «Delete post», when this phone posted it. The guide of «Use this plan»
 * takes the place of the plan in the same sheet (`page` «copy»): a sheet
 * opened from another and closed with it left iOS on a black screen.
 */
export function PlanPostDetail({
  page,
  plan,
  mine,
  drawingId,
  onUse,
  onCopied,
  onClose,
}: {
  /** What the sheet shows; null: closed. */
  page: "plan" | "copy" | null;
  plan: GymPlanPosted;
  mine: boolean;
  drawingId: string;
  /** «Use this plan»; absent on one's own post. */
  onUse?: () => void;
  /** The guide saved the copy, or was closed without. */
  onCopied: (saved: boolean) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={page !== null}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={page === "copy" ? () => onCopied(false) : onClose}
    >
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        {page === "plan" && (
          <DetailPage
            plan={plan}
            mine={mine}
            drawingId={drawingId}
            onUse={onUse}
            onClose={onClose}
          />
        )}
        {page === "copy" && <PlanCopy plan={plan} onDone={onCopied} />}
      </SafeAreaProvider>
    </Modal>
  );
}

function DetailPage({
  plan,
  mine,
  drawingId,
  onUse,
  onClose,
}: {
  plan: GymPlanPosted;
  mine: boolean;
  drawingId: string;
  onUse?: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const language = useLanguage();
  const sessions = postedSessions(plan);
  const outbox = usePlanPostOutbox();
  // One's own post is deleted by its key, which only the phone that posted
  // it has.
  const key =
    mine && outbox.owner !== null ? planPostKeyOf(outbox.owner, drawingId) : null;
  function onDelete() {
    if (key === null) {
      return;
    }
    Alert.alert(
      t("Delete this post?"),
      t("Copies already made stay with whoever made them."),
      [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Delete"),
          style: "destructive",
          onPress: () => {
            outbox.remove(key);
            onClose();
          },
        },
      ],
    );
  }
  return (
    <View
      style={[
        gymStyles.screen,
        { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg },
      ]}
      testID="plan-detail"
    >
      <View style={styles.top}>
        <Text style={styles.kind}>{t("Workout plan").toUpperCase()}</Text>
        <Pressable
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("Close")}
          testID="plan-detail-close"
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={gymStyles.title} accessibilityRole="header">
          {planTitle(plan)}
        </Text>
        <Text style={gymStyles.muted}>{planWeekLine(plan)}</Text>
        <Text style={gymStyles.muted}>{planSports(plan)}</Text>
        {sessions.map((session) => (
          <View key={session.day} style={styles.session} testID="plan-detail-day">
            <Text style={styles.heading}>{sessionHeading(sessions, session)}</Text>
            {session.run === undefined && session.outing === undefined && (
              <>
                {session.name.trim() !== "" && (
                  <Text style={gymStyles.muted}>{session.name}</Text>
                )}
                {session.items.map((item, i) => (
                  <Text key={i} style={gymStyles.text} testID="plan-detail-item">
                    {planItemText(item, language)}
                  </Text>
                ))}
              </>
            )}
          </View>
        ))}
      </ScrollView>
      {onUse !== undefined && (
        <Pressable
          style={({ pressed }) => [
            gymStyles.button,
            gymStyles.primary,
            styles.foot,
            pressed && styles.pressed,
          ]}
          onPress={onUse}
          accessibilityRole="button"
          testID="plan-detail-use"
        >
          <Text style={[gymStyles.buttonText, gymStyles.primaryText]}>
            {t("Use this plan")}
          </Text>
        </Pressable>
      )}
      {key !== null && (
        <Pressable
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          onPress={onDelete}
          accessibilityRole="button"
          testID="plan-detail-delete"
        >
          <Text style={[gymStyles.text, gymStyles.danger]}>{t("Delete post")}</Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * «Use this plan» (TASK-485, ADR-0394 point 6): a new plan of the copy,
 * kg included, in the guide's last step, the name and the first day, after
 * «How do you run today?» when it has runs; «Save plan» keeps it among
 * one's plans (`PUT /me/gym-plans/{key}`, at most 20, checked before it
 * opens: PlanPost). A page of the sheet of PlanPostDetail.
 */
export function PlanCopy({
  plan,
  onDone,
  fetchFn,
}: {
  plan: GymPlanPosted;
  /** Saved among one's plans, or closed without. */
  onDone: (saved: boolean) => void;
  fetchFn?: typeof fetch;
}) {
  const { keep } = useGymPlans(fetchFn);
  const copy = useMemo(() => planFromPosted(plan), [plan]);
  return (
    <CopyPage>
      <GymPlanWizard
        plan={copy}
        copied
        onSave={(draft) => {
          keep(null, draft);
          onDone(true);
        }}
        onClose={() => onDone(false)}
      />
    </CopyPage>
  );
}

function CopyPage({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        gymStyles.screen,
        styles.copy,
        { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg },
      ]}
      testID="plan-copy"
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: space.lg,
    paddingRight: space.sm,
  },
  kind: {
    ...font.label,
    color: color.textMuted,
  },
  close: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    ...font.body,
    color: color.textMuted,
  },
  content: {
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    gap: space.sm,
  },
  session: {
    gap: space.xs,
    paddingTop: space.md,
  },
  heading: {
    ...font.body,
    color: color.text,
    fontWeight: fontWeight.semibold,
  },
  foot: {
    flex: 0,
    marginHorizontal: space.lg,
  },
  link: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.6,
  },
  // As «My plans» holds the guide (GymPlans.tsx).
  copy: {
    gap: space.md,
    paddingHorizontal: space.lg,
  },
});
