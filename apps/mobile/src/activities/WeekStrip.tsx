import type { CalendarActivity, PersonalBest } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fetchActivityCalendar } from "../api/activityCalendar";
import { phoneTimeZone } from "../api/gymCalendar";
import { t } from "../i18n";
import { useFollowsDoor } from "../social/followsDoor";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import {
  ActivityCalendarSheet,
  activityCalendarTitle,
  CalendarIcon,
} from "./ActivityCalendar";
import { dayIcons, monthOf, totalsLine, weekOf, WEEKDAYS } from "./calendarText";

/** The activities of each day of the week, Monday first. */
type Week = CalendarActivity[][];

/**
 * The week of the profile (TASK-462, the user's choice «Nel profilo» and
 * «in tutti e due»): under the totals, «Calendar ›», the seven days from
 * Monday with the icons of the sports done and the week's totals; a tap
 * opens the calendar of the month. It asks the month of today, and the one
 * before when the week began in it. Nothing until the API answers: an API
 * without the calendar leaves the profile as it was.
 */
export function WeekStrip({
  bests,
  fetchFn,
  today: given,
}: {
  bests?: readonly PersonalBest[];
  /** For the tests: the API asked with this instead of `fetch`. */
  fetchFn?: typeof fetch;
  /** For the tests: the day of today. */
  today?: Date;
}) {
  const { apiUrl, account } = useFollowsDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const [today] = useState(() => given ?? new Date());
  const [week, setWeek] = useState<Week | null>(null);
  const [open, setOpen] = useState(false);
  const days = weekOf(today);

  useEffect(() => {
    if (apiUrl === null || token === null) {
      return;
    }
    let live = true;
    const zone = phoneTimeZone();
    const months = [...new Set(weekOf(today).map(monthOf))];
    void Promise.all(
      months.map((month) =>
        fetchActivityCalendar(apiUrl, token, zone, month, null, { fetchFn }),
      ),
    ).then((outcomes) => {
      if (!live) {
        return;
      }
      const byMonth = new Map<string, Map<number, CalendarActivity[]>>();
      for (const outcome of outcomes) {
        if (outcome.kind !== "ok") {
          return;
        }
        byMonth.set(
          outcome.value.month,
          new Map(outcome.value.days.map((day) => [day.day, day.activities])),
        );
      }
      setWeek(
        weekOf(today).map((day) => byMonth.get(monthOf(day))?.get(day.getDate()) ?? []),
      );
    });
    return () => {
      live = false;
    };
  }, [apiUrl, token, today, fetchFn]);

  if (week === null) {
    return null;
  }
  const done = week.flat();
  const todayIndex = (today.getDay() + 6) % 7;
  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${activityCalendarTitle()}, ${t("This week")}: ${totalsLine(
          done.length,
          done.reduce((sum, one) => sum + one.distance_m, 0),
          done.reduce((sum, one) => sum + one.duration_s, 0),
        )}`}
        testID="week-strip"
      >
        <View style={styles.top}>
          <View style={styles.named}>
            <CalendarIcon />
            <Text style={styles.title}>{activityCalendarTitle()}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </View>
        <View style={styles.days}>
          {days.map((day, index) => {
            const activities = week[index];
            return (
              <View
                key={index}
                style={[
                  styles.day,
                  // Today's border is grey only without an activity: done
                  // keeps its yellow, and today is said by its bold name.
                  index === todayIndex && styles.today,
                  activities.length > 0 && styles.dayDone,
                ]}
                testID={`week-day-${index}`}
              >
                <Text
                  style={[styles.weekday, index === todayIndex && styles.weekdayToday]}
                >
                  {t(WEEKDAYS[index])}
                </Text>
                <Text style={styles.icons}>
                  {activities.length > 0 ? dayIcons(activities) : String(day.getDate())}
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.summary} testID="week-summary">
          {done.length === 0
            ? `${t("This week")}: –`
            : `${t("This week")}: ${totalsLine(
                done.length,
                done.reduce((sum, one) => sum + one.distance_m, 0),
                done.reduce((sum, one) => sum + one.duration_s, 0),
              )}`}
        </Text>
      </Pressable>
      <ActivityCalendarSheet
        visible={open}
        onClose={() => setOpen(false)}
        bests={bests}
        fetchFn={fetchFn}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  pressed: {
    opacity: 0.6,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: MIN_TAP_SIZE - space.md,
  },
  named: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  title: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  arrow: {
    color: color.textMuted,
    fontSize: fontSize.title,
  },
  days: {
    flexDirection: "row",
    gap: space.xs,
  },
  day: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: space.xs,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
  },
  dayDone: {
    borderWidth: 1,
    borderColor: color.accent,
  },
  today: {
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  weekday: {
    color: color.textMuted,
    fontSize: fontSize.label,
  },
  weekdayToday: {
    color: color.text,
    fontWeight: fontWeight.bold,
  },
  icons: {
    color: color.text,
    fontSize: fontSize.small,
    fontVariant: ["tabular-nums"],
  },
  summary: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
});
