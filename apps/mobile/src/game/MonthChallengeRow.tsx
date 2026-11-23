import type { Contest } from "@shaperoute/shared-types";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { themedOf, themeText } from "../contest/contestApi";
import { openContestPage } from "../contest/contestDoor";
import { daysLeftText } from "../contest/daysLeft";
import { t } from "../i18n";
import type { Language } from "../i18n/languages";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";

type Props = {
  contest: Contest;
  language: Language;
  /** What the row says: the challenge itself, or its archive. */
  kind: "challenge" | "archive";
  nowMs: number;
};

/**
 * The monthly challenge in «Challenges» (TASK-423 part D, docs/GIOCO.md
 * §6.8): only a row with the link to its page (TASK-343), which has the
 * archive at its foot. Its theme when it has one, and the days it has left.
 */
export function MonthChallengeRow({ contest, language, kind, nowMs }: Props) {
  const themed = themedOf(contest);
  const title =
    kind === "archive"
      ? t("Past monthly challenges")
      : themed === null
        ? t("Monthly challenge")
        : themeText(themed.theme, language).title;
  const line =
    kind === "archive"
      ? t("Themes and winners of the past months")
      : `${t("Monthly challenge")} · ${daysLeftText(contest.ends_at, nowMs)}`;
  return (
    <Tap
      style={styles.row}
      onPress={() => openContestPage(contest.id)}
      accessibilityRole="link"
      accessibilityLabel={`${title}, ${line}`}
      testID={kind === "archive" ? "month-archive" : "month-challenge"}
    >
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.line} numberOfLines={1}>
          {line}
        </Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.md,
    minHeight: MIN_TAP_SIZE,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  line: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  arrow: {
    color: color.textMuted,
    fontSize: fontSize.title,
  },
});
