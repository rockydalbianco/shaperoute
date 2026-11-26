import type { ReactElement } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { gymStyles } from "../gym/gymStyles";
import { t } from "../i18n";
import { useLanguage } from "../i18n/useLanguage";
import { color, font, space } from "../theme/tokens";
import { WeekBody } from "../trainingmode/WeekBodyCard";
import { EmptyState } from "../ui/EmptyState";
import { glassRaise } from "../ui/glassRaise";
import { HEART } from "../ui/outlines";
import { useGlassMode } from "../ui/useGlassMode";
import type { CoachFetchers } from "./coachData";
import type { Tip } from "./rules";
import { TipCard } from "./TipCard";
import { type CoachState, useCoach } from "./useCoach";

type Props = {
  onBack: () => void;
  /** For the tests: the API the Coach reads. */
  fetchersOf?: (apiUrl: string, token: string) => CoachFetchers;
  fetchFn?: typeof fetch;
};

/**
 * The Coach (TASK-491 part B, ADR-0399): the body of the week as «Today»
 * shows it (TASK-490 part B), then at most three tips from the last four
 * weeks, each with the study it comes from. The plan changes only with
 * «Apply to plan». Without an account, an invitation; «My plans» opens it
 * (part C). «Based on your last 4 weeks» stands above the tips it is about,
 * not above the week's body; with nothing done in those weeks the page is
 * an empty one (TASK-509): no body at 0%, the figure, how the tips come
 * and «Go to your workouts», which leaves the Coach for the page it was
 * opened from, where a workout starts.
 */
export function CoachPage({ onBack, fetchersOf, fetchFn }: Props) {
  const language = useLanguage();
  const coach = useCoach(fetchersOf, fetchFn);
  // The chip stands out of the glass (TASK-469 A7c).
  const chipRaise = glassRaise(useGlassMode());
  const { state } = coach;
  const empty = state.kind === "ready" && state.empty;
  // Read from the four weeks: above the tips. Nothing read: where it was.
  const unread = state.kind === "signedOut" || state.kind === "unreachable";
  return (
    <ScrollView
      style={gymStyles.screen}
      contentContainerStyle={styles.content}
      testID="coach-page"
    >
      <View style={styles.top}>
        <Pressable
          style={[gymStyles.chip, chipRaise]}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t("Back")}
          testID="coach-back"
        >
          <Text style={gymStyles.chipText}>‹</Text>
        </Pressable>
        <View style={styles.titles}>
          <Text style={gymStyles.title} accessibilityRole="header">
            {t("Coach")}
          </Text>
          {unread && (
            <Text style={gymStyles.muted}>{t("Based on your last 4 weeks")}</Text>
          )}
        </View>
      </View>
      {!empty && <WeekBody fetchFn={fetchFn} />}
      {state.kind === "ready" && !empty && (
        <Text style={gymStyles.muted} testID="coach-weeks">
          {t("Based on your last 4 weeks")}
        </Text>
      )}
      <Tips
        state={state}
        onWorkouts={onBack}
        render={(tip) => (
          <TipCard
            key={`${tip.rule}:${tip.exercise ?? ""}:${tip.muscle ?? ""}`}
            tip={tip}
            language={language}
            onApply={() => coach.apply(tip)}
            onPutOff={() => coach.putOff(tip)}
          />
        )}
      />
      <Text style={styles.note}>
        {t(
          "Tips are general, not medical advice. If something hurts, stop and ask a professional.",
        )}
      </Text>
    </ScrollView>
  );
}

function Tips({
  state,
  onWorkouts,
  render,
}: {
  state: CoachState;
  onWorkouts: () => void;
  render: (tip: Tip) => ReactElement;
}) {
  switch (state.kind) {
    case "signedOut":
      return (
        <Text style={gymStyles.text} testID="coach-invite">
          {t("Create an account to get tips from your workouts")}
        </Text>
      );
    case "loading":
      return <ActivityIndicator color={color.textMuted} testID="coach-loading" />;
    case "unreachable":
      return (
        <Text style={gymStyles.muted} testID="coach-unreachable">
          {t("No connection. Try again when you are online.")}
        </Text>
      );
    case "ready":
      if (state.empty) {
        return (
          <EmptyState
            outline={HEART}
            message={t("Log a few workouts and your tips will show up here")}
            action={{ label: t("Go to your workouts"), onPress: onWorkouts }}
            testID="coach-empty"
          />
        );
      }
      if (state.tips.length === 0) {
        return (
          <Text style={gymStyles.text} testID="coach-nothing">
            {t("Nothing to change for now: keep going.")}
          </Text>
        );
      }
      return <View style={styles.tips}>{state.tips.map(render)}</View>;
  }
}

const styles = StyleSheet.create({
  content: {
    gap: space.lg,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xxl,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  titles: {
    flex: 1,
  },
  tips: {
    gap: space.md,
  },
  note: {
    ...font.detail,
    color: color.textFaint,
  },
});
