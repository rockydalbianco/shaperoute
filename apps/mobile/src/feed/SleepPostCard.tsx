import { StyleSheet, Text, View } from "react-native";

import { sleepSummaryOf } from "../api/sleep";
import { sleepPostsOn } from "../health/sleepModules";
import { sleepScoreText, sleepStageRows, sleepTimeText } from "../health/sleepText";
import { t } from "../i18n";
import { color, font, fontSize, fontWeight, radius, space } from "../theme/tokens";

type Props = {
  /** `sleep` of the post as its list gave it. */
  sleep: unknown;
  /** On the page of the post: under the night, whose score it is. */
  detail?: boolean;
};

/**
 * What the post of a night shows in the Feed, where a run has its map
 * (TASK-467 part E), in the texts the user approved on 2026-11-21: «Sleep
 * score», «82 · Very good», «7 h 40 min» and the stages when a watch told
 * them. On the page of the post also that MuW worked the score out from
 * Apple Health data. Never an hour of going to bed or of waking. Nothing
 * for an answer that is not a night, and while the sleep is off.
 */
export function SleepPostCard({ sleep, detail = false }: Props) {
  const night = sleepPostsOn() ? sleepSummaryOf(sleep) : null;
  if (night === null) {
    return null;
  }
  const stages = sleepStageRows(night);
  const said = [
    t("Sleep score"),
    sleepScoreText(night.score),
    sleepTimeText(night.asleep_min),
  ].join(", ");
  return (
    <View style={styles.card} testID="sleep-post-card">
      <View accessible accessibilityLabel={said}>
        <Text style={styles.title}>{t("Sleep score")}</Text>
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
              <Text style={styles.stageValue}>{stage.value}</Text>
              <Text style={styles.stageLabel}>{stage.label}</Text>
            </View>
          ))}
        </View>
      )}
      {detail && (
        <Text style={styles.note}>
          {t(
            "Worked out by MuW from Apple Health data. It can differ from the score in the Health app.",
          )}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // In place of the map of a run: a box on the surface.
  card: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  title: {
    ...font.label,
    color: color.textMuted,
  },
  score: {
    color: color.text,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  time: {
    ...font.body,
    color: color.text,
  },
  // The four stages side by side, each its time over its name.
  stages: {
    flexDirection: "row",
    gap: space.sm,
  },
  stage: {
    flex: 1,
    gap: 2,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
  },
  stageValue: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    fontVariant: ["tabular-nums"],
  },
  stageLabel: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  note: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
});
