import type { GameStreak } from "@shaperoute/shared-types";
import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { color, fontSize, fontWeight, radius, space } from "../theme/tokens";
import { streakRuleText, streakText } from "./personalText";

type Props = {
  streaks: GameStreak[];
};

/**
 * The streak (TASK-423 part D, docs/GIOCO.md §6.7): one card, three lines,
 * nothing to choose. Weeks in a row with at least 1, 2 or 3 outings, and
 * the longest of each.
 */
export function StreakCard({ streaks }: Props) {
  return (
    <View style={styles.card} testID="streak-card">
      <Text style={styles.title}>{t("Streak")}</Text>
      {streaks.map((streak) => {
        const rule = streakRuleText(streak);
        const length = streakText(streak);
        return (
          <View
            key={streak.runs}
            style={styles.line}
            accessible
            accessibilityLabel={`${rule}: ${length}`}
            testID={`streak-${streak.runs}`}
          >
            <Text style={styles.rule} numberOfLines={1}>
              {rule}
            </Text>
            <Text style={[styles.length, streak.current > 0 && styles.on]}>
              {length}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    gap: space.xs,
  },
  title: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  line: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.sm,
  },
  rule: {
    flex: 1,
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  length: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  on: {
    color: color.text,
  },
});
