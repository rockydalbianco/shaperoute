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
 * (part C).
 */
export function CoachPage({ onBack, fetchersOf, fetchFn }: Props) {
  const language = useLanguage();
  const coach = useCoach(fetchersOf, fetchFn);
  return (
    <ScrollView
      style={gymStyles.screen}
      contentContainerStyle={styles.content}
      testID="coach-page"
    >
      <View style={styles.top}>
        <Pressable
          style={gymStyles.chip}
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
          <Text style={gymStyles.muted}>{t("Based on your last 4 weeks")}</Text>
        </View>
      </View>
      <WeekBody fetchFn={fetchFn} />
      <Tips
        state={coach.state}
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
  render,
}: {
  state: CoachState;
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
          <Text style={gymStyles.text} testID="coach-empty">
            {t("Log a few workouts and your tips will show up here")}
          </Text>
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
