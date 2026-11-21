import type { ActivityCalendar } from "@shaperoute/shared-types";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { WEEKDAYS } from "../activities/calendarText";
import { monthGrid } from "../gym/GymCalendar";
import { monthLabel } from "../gym/Leaderboard";
import { t, tPlural } from "../i18n";
import { clockLabel } from "../navigation/freeRun";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";

/** «3 flights · 4:20:00», «No flights this month» (the user's words of
 * 2026-11-12). */
export function flightsLine(count: number, durationS: number): string {
  if (count === 0) {
    return t("No flights this month");
  }
  return tPlural(count, "{count} flight · {time}", "{count} flights · {time}", {
    time: clockLabel(durationS * 1000),
  });
}

/** The first letter of each day of the week, Monday first. */
function initials(): string[] {
  return WEEKDAYS.map((day) => t(day).slice(0, 1).toUpperCase());
}

type Props = {
  /** This month's flights, from the calendar asked for the flights alone. */
  calendar: ActivityCalendar;
  /** Opens the whole calendar on the flights. */
  onOpen: () => void;
};

/**
 * «Your flights» under «Record your flight» (TASK-305 part R5b): the month
 * with the days flown marked, and how many flights and how long. A touch
 * opens the calendar of TASK-462 on the flights.
 */
export function FlightsMonth({ calendar, onOpen }: Props) {
  const flown = new Set(calendar.days.map((day) => day.day));
  const line = flightsLine(calendar.count, calendar.duration_s);
  const title = t("Your flights");
  const month = monthLabel(calendar.month);
  return (
    <Pressable
      style={({ pressed }) => [styles.box, pressed && styles.pressed]}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${month}, ${line}`}
      testID="flights-month"
    >
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.muted}>{month}</Text>
      </View>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <View style={styles.week}>
          {initials().map((initial, i) => (
            <Text key={i} style={[styles.cell, styles.weekday]}>
              {initial}
            </Text>
          ))}
        </View>
        {monthGrid(calendar.month).map((week, row) => (
          <View key={row} style={styles.week}>
            {week.map((day, i) => (
              <View key={i} style={styles.cell}>
                {day !== null && (
                  <View
                    style={[styles.day, flown.has(day) && styles.flown]}
                    testID={flown.has(day) ? `flown-${day}` : undefined}
                  >
                    <Text style={[styles.dayText, flown.has(day) && styles.flownText]}>
                      {day}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        ))}
      </View>
      <View style={styles.foot}>
        <Text style={styles.line} testID="flights-line">
          {line}
        </Text>
        <Text style={styles.muted} importantForAccessibility="no">
          ›
        </Text>
      </View>
    </Pressable>
  );
}

const DAY_SIZE = 26;

const styles = StyleSheet.create({
  box: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    minHeight: MIN_TAP_SIZE,
  },
  pressed: {
    opacity: 0.85,
  },
  head: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: space.sm,
  },
  title: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  muted: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  week: {
    flexDirection: "row",
  },
  cell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 2,
  },
  weekday: {
    color: color.textMuted,
    fontSize: fontSize.detail,
    textAlign: "center",
  },
  day: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  // The days flown in the yellow of «Record your flight».
  flown: {
    backgroundColor: color.accent,
  },
  dayText: {
    color: color.textMuted,
    fontSize: fontSize.detail,
    fontVariant: ["tabular-nums"],
  },
  flownText: {
    color: color.onAccent,
    fontWeight: fontWeight.bold,
  },
  foot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  line: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
