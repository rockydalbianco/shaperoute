import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { color, font, fontWeight, radius, space } from "../theme/tokens";
import { useSleepOf } from "./sleepNow";
import { sleepScoreText, sleepStageRows, sleepTimeText } from "./sleepText";

type Props = {
  drawingId: string;
  /** `sleep` of the post as its list gave it. */
  sleep: unknown;
};

/**
 * The night of a post, a card of its page after the run's own (TASK-467
 * part B2), in the texts the user approved: «Sleep score», «82 · Very
 * good», «7 h 40 min», the stages when a watch told them, and under them
 * that MuW worked the score out from Apple Health data. Never an hour of
 * going to bed or of waking. Nothing for a post without a night, with one
 * its owner hides, and while the sleep in a post is off.
 */
export function SleepCard({ drawingId, sleep }: Props) {
  const night = useSleepOf(drawingId, sleep);
  if (night === null) {
    return null;
  }
  const stages = sleepStageRows(night);
  return (
    <View style={styles.card} testID="post-sleep">
      <Text style={styles.title} accessibilityRole="header">
        {t("Sleep score")}
      </Text>
      <View>
        <Text style={styles.score}>{sleepScoreText(night.score)}</Text>
        <Text style={styles.time}>{sleepTimeText(night.asleep_min)}</Text>
      </View>
      {stages.length > 0 && (
        <View style={styles.stages}>
          {stages.map((stage) => (
            <View
              key={stage.key}
              style={styles.stage}
              accessible
              accessibilityLabel={`${stage.label}: ${stage.value}`}
            >
              <Text style={styles.stageLabel}>{stage.label}</Text>
              <Text style={styles.stageValue}>{stage.value}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.note}>
        {t(
          "Worked out by MuW from Apple Health data. It can differ from the score in the Health app.",
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // As the cards of the page of a post (feed/PostPage.tsx).
  card: {
    gap: space.md,
    marginHorizontal: space.lg,
    marginTop: space.lg,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  title: {
    ...font.label,
    color: color.textMuted,
  },
  score: {
    ...font.cardTitle,
    color: color.text,
  },
  time: {
    ...font.body,
    color: color.text,
  },
  stages: {
    gap: space.xs,
  },
  stage: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.md,
  },
  stageLabel: {
    ...font.body,
    color: color.textMuted,
  },
  stageValue: {
    ...font.body,
    color: color.text,
    fontWeight: fontWeight.semibold,
  },
  note: {
    ...font.small,
    color: color.textMuted,
  },
});
