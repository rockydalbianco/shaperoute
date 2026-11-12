import type { SleepSummary } from "@shaperoute/shared-types";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { sleepScoreText, sleepStageRows, sleepTimeText } from "../health/sleepText";
import { t } from "../i18n";
import { color, font, fontSize, fontWeight, radius, space } from "../theme/tokens";
import { measuredDay } from "./Vo2MaxRow";

type BoxProps = {
  /** «Sleep score» over what the box says; left out before the user's yes. */
  titled?: boolean;
  /** The night's day, YYYY-MM-DD: «12 Nov» beside the title. */
  day?: string;
  testID?: string;
  children?: ReactNode;
};

/** The box of the sleep on a profile, as the VO₂ max over it
 * (Vo2MaxRow.tsx). */
export function SleepBox({ titled = true, day, testID, children }: BoxProps) {
  const said = day === undefined ? "" : measuredDay(day);
  return (
    <View style={styles.box} testID={testID}>
      {titled && (
        <View style={styles.top}>
          <Text style={styles.title} accessibilityRole="header">
            {t("Sleep score")}
          </Text>
          {said !== "" && <Text style={styles.day}>{said}</Text>}
        </View>
      )}
      {children}
    </View>
  );
}

type Props = {
  night: SleepSummary;
  /** `profile-sleep` on another's profile; the owner's card has its own. */
  testID?: string;
  /** Under the night, in its box: what the owner alone sees (`OwnSleep`). */
  children?: ReactNode;
};

/**
 * A night of sleep on a profile (TASK-467 part B3), in the texts the user
 * approved: «Sleep score», «82 · Very good», «7 h 40 min», the stages when
 * a watch told them, and under them that MuW worked the score out from
 * Apple Health data. Beside the title the day of the night, «12 Nov» (the
 * user's choice of 2026-11-12: a night stays on the profile until another
 * is shared, so it says of when it is). Never an hour of going to bed or
 * of waking. On another's profile the API sends it only after its owner's
 * «Share».
 */
export function ProfileSleep({ night, testID = "profile-sleep", children }: Props) {
  const stages = sleepStageRows(night);
  return (
    <SleepBox day={night.night} testID={testID}>
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
      {children}
    </SleepBox>
  );
}

// As the VO₂ max and the personal bests over it: a box on the surface.
const styles = StyleSheet.create({
  box: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  top: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: space.sm,
  },
  title: {
    ...font.heading,
    color: color.text,
  },
  day: {
    color: color.textMuted,
    fontSize: fontSize.small,
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
    color: color.textMuted,
    fontSize: fontSize.small,
  },
});
