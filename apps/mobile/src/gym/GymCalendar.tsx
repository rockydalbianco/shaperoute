import type { GymCalendar, GymCalendarWorkout } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { accountProblem } from "../account/messages";
import { fetchGymCalendar, phoneMonth, phoneTimeZone } from "../api/gymCalendar";
import { shiftMonth } from "../api/gymLeaderboard";
import { t, tLater } from "../i18n";
import { clockLabel } from "../navigation/freeRun";
import { useDrawingsDoor } from "../social/drawingsDoor";
import { useFollowsDoor } from "../social/followsDoor";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { gymStyles } from "./gymStyles";
import { monthLabel } from "./Leaderboard";

/** The week from Monday, as a calendar of Europe reads it. */
const WEEK = [
  tLater("Mon"),
  tLater("Tue"),
  tLater("Wed"),
  tLater("Thu"),
  tLater("Fri"),
  tLater("Sat"),
  tLater("Sun"),
];

/** The days of `month` (YYYY-MM) in rows of a week from Monday: null for
 * the cells before the first and after the last. */
export function monthGrid(month: string): (number | null)[][] {
  const [year, number] = month.split("-").map(Number);
  const offset = (new Date(year, number - 1, 1).getDay() + 6) % 7;
  const length = new Date(year, number, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return Array.from({ length: cells.length / 7 }, (_, row) =>
    cells.slice(row * 7, row * 7 + 7),
  );
}

/** «3 times · 2:45:00»: the workouts of a month and their time. */
export function monthSummary(count: number, durationS: number): string {
  const time = clockLabel(durationS * 1000);
  return count === 1
    ? `${t("Workout")} · ${time}`
    : t("{n} times · {time}", { n: String(count), time });
}

/** «17:30 · 55:00»: when a workout began, on the phone's clock, and its time. */
function workoutLine(workout: GymCalendarWorkout): string {
  const when = new Date(workout.started_at);
  const hours = String(when.getHours()).padStart(2, "0");
  const minutes = String(when.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes} · ${clockLabel(workout.duration_s * 1000)}`;
}

/** The title of the calendar and of the line that opens it. */
export function calendarTitle(): string {
  return t("Gym calendar");
}

type Props = {
  visible: boolean;
  onClose: () => void;
  /** For the tests: the API asked with this instead of `fetch`. */
  fetchFn?: typeof fetch;
  /** For the tests: the month it opens on, instead of this one. */
  month?: string;
};

/**
 * The calendar of one's own workouts at the gym over the whole screen
 * (TASK-411 B, ADR-0341, the user's «Mese con giorni segnati»): a month in a
 * grid from Monday, a yellow dot on the days with a workout, «‹ ›» for the
 * months, how many workouts and their time. A day touched lists its
 * workouts; one with a post opens it. Only the owner's, from the API.
 */
export function GymCalendarSheet({ visible, onClose, fetchFn, month }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Over the whole screen: the Pager's pages have no top edge of their own. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        {visible && <CalendarPage onClose={onClose} fetchFn={fetchFn} first={month} />}
      </SafeAreaProvider>
    </Modal>
  );
}

/** What the API said, for the month of `asked`. */
type Shown = { asked: string } & (
  { kind: "ok"; calendar: GymCalendar } | { kind: "failed"; words: string }
);

function CalendarPage({
  onClose,
  fetchFn,
  first,
}: {
  onClose: () => void;
  fetchFn?: typeof fetch;
  first?: string;
}) {
  const insets = useSafeAreaInsets();
  const { apiUrl, account } = useFollowsDoor();
  const drawings = useDrawingsDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const [today] = useState(() => phoneMonth());
  const [month, setMonth] = useState(first ?? today);
  const [chosen, setChosen] = useState<number | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);

  useEffect(() => {
    if (apiUrl === null || token === null) {
      return;
    }
    let live = true;
    void fetchGymCalendar(apiUrl, token, phoneTimeZone(), month, { fetchFn }).then(
      (outcome) => {
        if (!live) {
          return;
        }
        setShown(
          outcome.kind === "ok"
            ? { asked: month, kind: "ok", calendar: outcome.value }
            : { asked: month, kind: "failed", words: accountProblem(outcome) },
        );
      },
    );
    return () => {
      live = false;
    };
  }, [apiUrl, token, month, fetchFn]);

  // Another month asked: nothing until it comes.
  const now = shown !== null && shown.asked === month ? shown : null;
  const calendar = now?.kind === "ok" ? now.calendar : null;
  const workoutsOf = new Map(
    (calendar?.days ?? []).map((day) => [day.day, day.workouts] as const),
  );
  // The days of a plan gone by without it (part C): a grey dot.
  const skippedOf = new Map<number, string[]>();
  for (const missed of calendar?.skipped ?? []) {
    skippedOf.set(missed.day, [...(skippedOf.get(missed.day) ?? []), missed.plan]);
  }
  const isLatest = month >= today;
  const before = shiftMonth(month, -1);
  const after = shiftMonth(month, 1);
  const todayDate = new Date();
  const todayDay = month === today ? todayDate.getDate() : null;
  const listed = chosen === null ? [] : (workoutsOf.get(chosen) ?? []);

  function go(to: string) {
    setChosen(null);
    setMonth(to);
  }

  function open(workout: GymCalendarWorkout) {
    if (workout.drawing_id === null) {
      return;
    }
    onClose();
    drawings.open({ id: workout.drawing_id });
  }

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg },
      ]}
      testID="gym-calendar"
    >
      <Text style={styles.title} accessibilityRole="header">
        {calendarTitle()}
      </Text>
      <View style={styles.months}>
        <Pressable
          style={styles.arrow}
          onPress={() => go(before)}
          accessibilityRole="button"
          accessibilityLabel={monthLabel(before)}
          testID="calendar-before"
        >
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Text style={styles.month}>{monthLabel(month)}</Text>
        <Pressable
          style={[styles.arrow, isLatest && styles.hidden]}
          disabled={isLatest}
          onPress={() => go(after)}
          accessibilityRole="button"
          accessibilityLabel={monthLabel(after)}
          accessibilityElementsHidden={isLatest}
          testID="calendar-after"
        >
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>
      <Text style={gymStyles.muted} testID="calendar-summary">
        {calendar === null || calendar.count === 0
          ? ""
          : monthSummary(calendar.count, calendar.duration_s)}
      </Text>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.week}>
          {WEEK.map((day) => (
            <Text key={day} style={styles.weekday} importantForAccessibility="no">
              {t(day)}
            </Text>
          ))}
        </View>
        {monthGrid(month).map((row, index) => (
          <View key={index} style={styles.week}>
            {row.map((day, cell) => {
              if (day === null) {
                return <View key={`empty-${cell}`} style={styles.cell} />;
              }
              const workouts = workoutsOf.get(day) ?? [];
              const trained = workouts.length > 0;
              const missed = skippedOf.get(day) ?? [];
              const planned = !trained && missed.length > 0;
              return (
                <Pressable
                  key={day}
                  style={({ pressed }) => [
                    styles.cell,
                    day === todayDay && styles.today,
                    day === chosen && styles.chosen,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setChosen(trained || planned ? day : null)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    trained
                      ? `${day} ${monthLabel(month)}, ${t("Workout")}`
                      : planned
                        ? `${day} ${monthLabel(month)}, ${t("Planned")}`
                        : undefined
                  }
                  accessibilityState={{ selected: day === chosen }}
                  testID={`calendar-day-${day}`}
                >
                  <Text style={styles.dayText}>{day}</Text>
                  <View
                    style={[
                      styles.dot,
                      trained && styles.trained,
                      planned && styles.planned,
                    ]}
                    testID={
                      trained
                        ? `calendar-dot-${day}`
                        : planned
                          ? `calendar-skipped-${day}`
                          : undefined
                    }
                  />
                </Pressable>
              );
            })}
          </View>
        ))}
        {chosen !== null &&
          (skippedOf.get(chosen) ?? []).map((plan) => (
            <Text key={plan} style={gymStyles.muted} testID="calendar-skipped">
              {`${t("Planned")} · ${plan}`}
            </Text>
          ))}
        {listed.map((workout) => (
          <Pressable
            key={workout.id}
            style={({ pressed }) => [styles.workout, pressed && styles.pressed]}
            onPress={() => open(workout)}
            disabled={workout.drawing_id === null}
            accessibilityRole={workout.drawing_id === null ? "text" : "button"}
            testID="calendar-workout"
          >
            <Text style={gymStyles.text}>
              {`🏋️ ${workoutLine(workout)}${workout.plan == null ? "" : ` · ${workout.plan}`}`}
            </Text>
            {workout.drawing_id !== null && <Text style={styles.chevron}>›</Text>}
          </Pressable>
        ))}
        {now?.kind === "failed" && (
          <Text style={[gymStyles.muted, gymStyles.danger]}>{now.words}</Text>
        )}
      </ScrollView>
      <Pressable
        style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        onPress={onClose}
        accessibilityRole="button"
        testID="calendar-close"
      >
        <Text style={styles.closeText}>{t("Close")}</Text>
      </Pressable>
    </View>
  );
}

const DOT = 6;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: space.md,
    paddingHorizontal: space.lg,
    backgroundColor: color.background,
  },
  title: {
    color: color.text,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
    textAlign: "center",
  },
  months: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  arrow: {
    minWidth: MIN_TAP_SIZE,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: {
    color: color.text,
    fontSize: fontSize.title,
  },
  hidden: {
    opacity: 0,
  },
  month: {
    flex: 1,
    textAlign: "center",
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  body: {
    gap: space.xs,
    paddingBottom: space.lg,
  },
  week: {
    flexDirection: "row",
    gap: space.xs,
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  cell: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderRadius: radius.md,
  },
  today: {
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  chosen: {
    backgroundColor: color.surfaceRaised,
  },
  pressed: {
    opacity: 0.7,
  },
  dayText: {
    color: color.text,
    fontSize: fontSize.body,
    fontVariant: ["tabular-nums"],
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  trained: {
    backgroundColor: color.accent,
  },
  planned: {
    backgroundColor: color.textFaint,
  },
  workout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  chevron: {
    color: color.textMuted,
    fontSize: fontSize.title,
  },
  close: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  closeText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
