import { StyleSheet, Text, View } from "react-native";

import { WEEKDAYS } from "../activities/calendarText";
import { t } from "../i18n";
import { color, fontSize, fontWeight, radius, space, tracking } from "../theme/tokens";
import type { StretchWeek as Week } from "./useStretchWeek";

type Props = {
  week: Week;
  /** The day of today, to mark it: Monday is 0. */
  today: number;
  /** The colour of a day done. */
  tint: string;
};

/**
 * «This week» at the top of the stretching home (TASK-520 part D2): the
 * seven days from Monday, the ones with a stretching session ticked, and how
 * many sessions and minutes they make. One line for a screen reader. A day
 * done is filled and ticked, never told by its colour alone.
 */
export function StretchWeek({ week, today, tint }: Props) {
  const totals =
    week.sessions === 1
      ? t("1 session · {minutes} min", { minutes: week.minutes })
      : t("{count} sessions · {minutes} min", {
          count: week.sessions,
          minutes: week.minutes,
        });
  return (
    <View
      style={styles.strip}
      accessible
      accessibilityLabel={`${t("This week")}: ${totals}`}
      testID="stretch-week"
    >
      <View style={styles.top}>
        <Text style={styles.title}>{t("This week")}</Text>
        <Text style={styles.totals}>{totals}</Text>
      </View>
      <View style={styles.days}>
        {week.days.map((done, day) => (
          <View key={WEEKDAYS[day]} style={styles.day}>
            <View
              style={[
                styles.dot,
                done && { backgroundColor: tint, borderColor: tint },
                day === today && !done && styles.dotToday,
              ]}
              testID={`stretch-week-day-${day}${done ? "-done" : ""}`}
            >
              {done && <Text style={styles.tick}>✓</Text>}
            </View>
            <Text style={[styles.name, day === today && styles.nameToday]}>
              {t(WEEKDAYS[day])}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const DOT = 28;

const styles = StyleSheet.create({
  strip: {
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  top: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: space.sm,
  },
  title: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: tracking.label,
    textTransform: "uppercase",
  },
  totals: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  days: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  day: {
    alignItems: "center",
    gap: space.xs,
  },
  dot: {
    width: DOT,
    height: DOT,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: color.border,
  },
  dotToday: {
    borderColor: color.text,
  },
  tick: {
    color: color.background,
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
  },
  name: {
    color: color.textFaint,
    fontSize: fontSize.label,
  },
  nameToday: {
    color: color.text,
    fontWeight: fontWeight.semibold,
  },
});
