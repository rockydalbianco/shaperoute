import type {
  ActivityCalendar,
  CalendarActivity,
  PersonalBest,
  RunActivity,
} from "@shaperoute/shared-types";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { accountProblem } from "../account/messages";
import { fetchActivityCalendar } from "../api/activityCalendar";
import { phoneMonth, phoneTimeZone } from "../api/gymCalendar";
import { shiftMonth } from "../api/gymLeaderboard";
import { monthGrid } from "../gym/GymCalendar";
import { monthLabel } from "../gym/Leaderboard";
import { t } from "../i18n";
import { PersonalBests } from "../profile/PersonalBests";
import { DrawingsContext, useDrawingsDoor } from "../social/drawingsDoor";
import { useFollowsDoor } from "../social/followsDoor";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { ActivitiesContext, useActivitiesDoor } from "./activitiesDoor";
import { MONTHS } from "./activityText";
import {
  activityLine,
  activityTitle,
  barHeights,
  dayIcons,
  monthInitial,
  sportEmoji,
  sportName,
  totalsLine,
  WEEKDAYS,
} from "./calendarText";

/** The height of the tallest bar of the twelve months. */
const BAR_HEIGHT = 72;
/** A month with activities is never a bar of nothing. */
const BAR_MIN = 3;

/** The title of the calendar and of the rows that open it. */
export function activityCalendarTitle(): string {
  return t("Calendar");
}

/** The calendar of Lucide, as the ski tab's (TASK-444: line icons, not
 * emoji, on what the app does): white, coloured by `tintColor`. */
const CALENDAR = require("../../assets/ui/tabs/calendar.png");
/** The side of the icon beside a title. */
export const CALENDAR_ICON_SIZE = 20;

/** The icon of the rows that open the calendar, in the colour of the text. */
export function CalendarIcon() {
  return (
    <Image
      source={CALENDAR}
      style={styles.calendarIcon}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

/** Whether an activity of a day opens on the map, as in «My activities»: a
 * swim in a pool has no line to show (TASK-400). */
export function opensRun(activity: CalendarActivity): boolean {
  return !(activity.activity === "swimming" && !activity.tracked);
}

type Props = {
  visible: boolean;
  onClose: () => void;
  /** The records of the profile, shown under the bars for the sport chosen;
   * none where the page has none. */
  bests?: readonly PersonalBest[];
  /** For the tests: the API asked with this instead of `fetch`. */
  fetchFn?: typeof fetch;
  /** For the tests: the month it opens on, instead of this one. */
  month?: string;
};

/**
 * The calendar of all one's activities over the whole screen (TASK-462,
 * ADR-0372, the user's choices of 2026-11-11): a month in a grid from
 * Monday with the icons of the sports done each day, «‹ ›» for the months,
 * the month's totals and a filter by sport. A day touched lists its
 * activities with time, km, pace and calories; one opens its run, as in
 * «My activities». Under the grid the twelve months up to it as bars of
 * their time («storico tempi»), a bar opens its month, and the records of
 * the profile. The same from «Profile» and from «My activities».
 */
export function ActivityCalendarSheet({
  visible,
  onClose,
  bests,
  fetchFn,
  month,
}: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Over the whole screen: the Pager's pages have no top edge of their own. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        {visible && (
          <CalendarPage
            onClose={onClose}
            bests={bests}
            fetchFn={fetchFn}
            first={month}
          />
        )}
      </SafeAreaProvider>
    </Modal>
  );
}

/** What the API said, for the month and the sport of `asked`. */
type Shown = { asked: string } & (
  { kind: "ok"; calendar: ActivityCalendar } | { kind: "failed"; words: string }
);

function CalendarPage({
  onClose,
  bests,
  fetchFn,
  first,
}: {
  onClose: () => void;
  bests?: readonly PersonalBest[];
  fetchFn?: typeof fetch;
  first?: string;
}) {
  const insets = useSafeAreaInsets();
  const { apiUrl, account } = useFollowsDoor();
  const activities = useActivitiesDoor();
  const drawings = useDrawingsDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const [today] = useState(() => phoneMonth());
  const [month, setMonth] = useState(first ?? today);
  const [sport, setSport] = useState<RunActivity | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  // The sports of the account, kept while another month or sport comes.
  const [sports, setSports] = useState<RunActivity[]>([]);
  const asked = `${month}|${sport ?? ""}`;

  useEffect(() => {
    if (apiUrl === null || token === null) {
      return;
    }
    let live = true;
    void fetchActivityCalendar(apiUrl, token, phoneTimeZone(), month, sport, {
      fetchFn,
    }).then((outcome) => {
      if (!live) {
        return;
      }
      if (outcome.kind === "ok") {
        setSports(outcome.value.sports);
      }
      setShown(
        outcome.kind === "ok"
          ? { asked, kind: "ok", calendar: outcome.value }
          : { asked, kind: "failed", words: accountProblem(outcome) },
      );
    });
    return () => {
      live = false;
    };
  }, [apiUrl, token, month, sport, asked, fetchFn]);

  // Another month or sport asked: nothing until it comes.
  const now = shown !== null && shown.asked === asked ? shown : null;
  const calendar = now?.kind === "ok" ? now.calendar : null;
  const activitiesOf = new Map(
    (calendar?.days ?? []).map((day) => [day.day, day.activities] as const),
  );
  const isLatest = month >= today;
  const before = shiftMonth(month, -1);
  const after = shiftMonth(month, 1);
  const todayDay = month === today ? new Date().getDate() : null;
  const listed = chosen === null ? [] : (activitiesOf.get(chosen) ?? []);
  const shownBests = (bests ?? []).filter(
    (best) => sport === null || best.sport === sport,
  );

  // A record opened from here closes the calendar first: its run shows
  // under it otherwise.
  const closingActivities = useMemo(
    () => ({
      ...activities,
      open: (activity: { id: string }) => {
        onClose();
        activities.open(activity);
      },
    }),
    [activities, onClose],
  );
  const closingDrawings = useMemo(
    () => ({
      ...drawings,
      open: (...args: Parameters<typeof drawings.open>) => {
        onClose();
        drawings.open(...args);
      },
    }),
    [drawings, onClose],
  );

  function go(to: string) {
    setChosen(null);
    setMonth(to);
  }

  function choose(to: RunActivity | null) {
    setChosen(null);
    setSport(to);
  }

  function open(activity: CalendarActivity) {
    onClose();
    activities.open(activity);
  }

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg },
      ]}
      testID="activity-calendar"
    >
      <Text style={styles.title} accessibilityRole="header">
        {activityCalendarTitle()}
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
      <Text style={styles.muted} testID="calendar-summary">
        {calendar === null || calendar.count === 0
          ? ""
          : totalsLine(calendar.count, calendar.distance_m, calendar.duration_s)}
      </Text>
      <ScrollView contentContainerStyle={styles.body}>
        {sports.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <Chip name={t("All")} on={sport === null} onPress={() => choose(null)} />
            {sports.map((one) => (
              <Chip
                key={one}
                name={`${sportEmoji(one)} ${sportName(one)}`}
                on={sport === one}
                onPress={() => choose(one)}
                testID={`calendar-sport-${one}`}
              />
            ))}
          </ScrollView>
        )}
        <View style={styles.week}>
          {WEEKDAYS.map((day) => (
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
              const done = activitiesOf.get(day) ?? [];
              const any = done.length > 0;
              return (
                <Pressable
                  key={day}
                  style={({ pressed }) => [
                    styles.cell,
                    day === todayDay && styles.today,
                    day === chosen && styles.chosen,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setChosen(any ? day : null)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    any
                      ? `${day} ${monthLabel(month)}, ${done
                          .map((one) => sportName(one.activity))
                          .join(", ")}`
                      : undefined
                  }
                  accessibilityState={{ selected: day === chosen }}
                  testID={`calendar-day-${day}`}
                >
                  <Text style={styles.dayText}>{day}</Text>
                  <Text
                    style={styles.icons}
                    testID={any ? `calendar-icons-${day}` : undefined}
                  >
                    {any ? dayIcons(done) : " "}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
        {listed.map((activity) => {
          const opens = opensRun(activity);
          return (
            <Pressable
              key={activity.id}
              style={({ pressed }) => [styles.activity, pressed && styles.pressed]}
              onPress={() => open(activity)}
              disabled={!opens}
              accessibilityRole={opens ? "button" : "text"}
              testID="calendar-activity"
            >
              <Text style={styles.activityIcon}>{sportEmoji(activity.activity)}</Text>
              <View style={styles.activityWords}>
                <Text style={styles.text} numberOfLines={1}>
                  {activityTitle(activity)}
                </Text>
                <Text style={styles.muted} numberOfLines={1}>
                  {activityLine(activity)}
                </Text>
              </View>
              {opens && <Text style={styles.chevron}>›</Text>}
            </Pressable>
          );
        })}
        {now?.kind === "failed" && (
          <Text style={[styles.muted, styles.danger]}>{now.words}</Text>
        )}
        {calendar !== null && (
          <View style={styles.trend} testID="calendar-trend">
            <Text style={styles.trendTitle} accessibilityRole="header">
              {t("Last 12 months")}
            </Text>
            <View style={styles.bars}>
              {calendar.trend.map((one, index) => {
                const height = barHeights(calendar.trend)[index];
                return (
                  <Pressable
                    key={one.month}
                    style={styles.barColumn}
                    onPress={() => go(one.month)}
                    accessibilityRole="button"
                    accessibilityLabel={`${monthLabel(one.month)}, ${totalsLine(
                      one.count,
                      one.distance_m,
                      one.duration_s,
                    )}`}
                    accessibilityState={{ selected: one.month === month }}
                    testID={`calendar-bar-${one.month}`}
                  >
                    <View style={styles.barSpace}>
                      <View
                        style={[
                          styles.bar,
                          one.month === month && styles.barShown,
                          {
                            height:
                              one.count > 0
                                ? Math.max(BAR_MIN, height * BAR_HEIGHT)
                                : 0,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>
                      {monthInitial(one.month, MONTHS)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.muted} testID="calendar-trend-total">
              {totalsLine(
                calendar.trend.reduce((sum, one) => sum + one.count, 0),
                calendar.trend.reduce((sum, one) => sum + one.distance_m, 0),
                calendar.trend.reduce((sum, one) => sum + one.duration_s, 0),
              )}
            </Text>
          </View>
        )}
        {shownBests.length > 0 && (
          <ActivitiesContext.Provider value={closingActivities}>
            <DrawingsContext.Provider value={closingDrawings}>
              <PersonalBests bests={shownBests} />
            </DrawingsContext.Provider>
          </ActivitiesContext.Provider>
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

function Chip({
  name,
  on,
  onPress,
  testID,
}: {
  name: string;
  on: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        on && styles.chipOn,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      testID={testID}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  calendarIcon: {
    width: CALENDAR_ICON_SIZE,
    height: CALENDAR_ICON_SIZE,
    tintColor: color.text,
  },
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
  text: {
    color: color.text,
    fontSize: fontSize.body,
  },
  muted: {
    color: color.textMuted,
    fontSize: fontSize.small,
    textAlign: "center",
  },
  danger: {
    color: color.error,
  },
  body: {
    gap: space.xs,
    paddingBottom: space.lg,
  },
  chips: {
    gap: space.sm,
    paddingBottom: space.sm,
  },
  chip: {
    minHeight: MIN_TAP_SIZE - space.sm,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  chipOn: {
    backgroundColor: color.accent,
    borderColor: color.accent,
  },
  chipText: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  chipTextOn: {
    color: color.onAccent,
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
    minHeight: MIN_TAP_SIZE + space.sm,
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
  icons: {
    fontSize: fontSize.detail,
  },
  activity: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  activityIcon: {
    fontSize: fontSize.heading,
  },
  activityWords: {
    flex: 1,
    gap: 2,
    alignItems: "flex-start",
  },
  chevron: {
    color: color.textMuted,
    fontSize: fontSize.title,
  },
  trend: {
    gap: space.sm,
    marginTop: space.lg,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  trendTitle: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space.xs,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    gap: space.xs,
    minHeight: MIN_TAP_SIZE,
  },
  barSpace: {
    height: BAR_HEIGHT,
    width: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderRadius: radius.sm / 2,
    backgroundColor: color.borderStrong,
  },
  barShown: {
    backgroundColor: color.accent,
  },
  barLabel: {
    color: color.textMuted,
    fontSize: fontSize.label,
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
