import { useRef, useState, useSyncExternalStore } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { WEEKDAYS } from "../activities/calendarText";
import { t } from "../i18n";
import { askPushPermission, type PushPermission } from "../notifications/pushDevice";
import { OpenSettings } from "../permissions/OpenSettings";
import { PUSH_NOT_ALLOWED } from "../settings/notificationFields";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import {
  AFTER_ALARM_MIN,
  appMorning,
  clock,
  type MorningNotifier,
  type MorningStretch,
  saveMorning,
  subscribeMorning,
  syncMorningNotices,
  WEEK,
  type Weekday,
} from "./morning";
import { MINUTES } from "./routines";

/** How far a tap on − or + moves the minutes. */
export const MINUTE_STEP = 5;

type Props = {
  /** The phone's question about notifications; the tests put their own. */
  ask?: () => Promise<PushPermission>;
  /** The phone's scheduled notifications; the tests put their own. */
  notifier?: MorningNotifier;
};

/**
 * «Morning stretch» in «Settings» (TASK-466 part D, ADR-0378; the user's
 * choices of 2026-11-12): a row with «Off» or the alarm's time and the
 * length at its end. A tap opens the page: the switch, off at first; the
 * time the alarm rings, which the user sets here since no app may read the
 * phone's alarms; the days, Monday to Friday at first; 3, 5 or 10 minutes.
 * Turning it on asks the phone for notifications, the same permission as
 * the push ones; refused, the switch stays off and says where to allow
 * them. Every change is kept at once and the phone's notifications follow.
 */
export function MorningStretchSetting({ ask = askPushPermission, notifier }: Props) {
  const setting = useSyncExternalStore(subscribeMorning, appMorning);
  const [open, setOpen] = useState(false);
  const shown = setting.on
    ? `${clock(setting.hour, setting.minute)} · ${t("{minutes} min", { minutes: setting.minutes })}`
    : t("Off");
  return (
    <View style={styles.menu}>
      <Tap
        style={styles.row}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        // One name for the row: the emoji is not read on its own.
        accessibilityLabel={`${t("Morning stretch")}, ${shown}`}
      >
        <Text style={styles.emoji}>🌅</Text>
        <Text style={styles.rowText}>{t("Morning stretch")}</Text>
        <Text style={styles.value}>{shown}</Text>
      </Tap>
      <Modal
        visible={open}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        {/* Its own edges: opened from «Profile», a page of the tab bar, whose
            frame says top 0 (TASK-366). */}
        {open && (
          <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <Page
              setting={setting}
              ask={ask}
              notifier={notifier}
              onClose={() => setOpen(false)}
            />
          </SafeAreaProvider>
        )}
      </Modal>
    </View>
  );
}

function Page({
  setting,
  ask,
  notifier,
  onClose,
}: {
  setting: MorningStretch;
  ask: () => Promise<PushPermission>;
  notifier: MorningNotifier | undefined;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  // The phone refused notifications: the reason, and the way to allow them.
  const [refused, setRefused] = useState(false);
  const asking = useRef(false);

  /** Keeps `change` on top of the setting, and the phone's notices with it. */
  function keep(change: Partial<MorningStretch>) {
    const next = { ...appMorning(), ...change };
    saveMorning(next);
    void syncMorningNotices(next, notifier);
  }

  async function turn(on: boolean) {
    if (asking.current) {
      return;
    }
    setRefused(false);
    if (on) {
      // The phone first: a switch on with notifications refused would
      // remind of nothing.
      asking.current = true;
      const answer = await ask();
      asking.current = false;
      if (answer !== "granted") {
        setRefused(true);
        return;
      }
    }
    keep({ on });
  }

  function toggleDay(day: Weekday) {
    const days = setting.days.includes(day)
      ? setting.days.filter((d) => d !== day)
      : WEEK.filter((d) => d === day || setting.days.includes(d));
    // Never no day at all: the last one stays.
    if (days.length > 0) {
      keep({ days });
    }
  }

  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Tap style={styles.back} onPress={onClose} accessibilityRole="button">
          <Text style={styles.backText}>{t("Back")}</Text>
        </Tap>
        <Text style={styles.title} accessibilityRole="header">
          {t("Morning stretch")}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + space.xl },
        ]}
      >
        <Text style={styles.intro}>
          {t(
            "MuW can't read your phone's alarm. Set here the time it rings: {minutes} minutes later a reminder opens your Morning routine.",
            { minutes: AFTER_ALARM_MIN },
          )}
        </Text>
        <View style={styles.menu}>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() => void turn(!setting.on)}
            accessibilityRole="switch"
            accessibilityLabel={t("Morning stretch")}
            accessibilityState={{ checked: setting.on }}
          >
            <Text style={styles.rowText}>{t("Morning stretch")}</Text>
            <View style={[styles.track, setting.on && styles.trackOn]}>
              <View style={[styles.knob, setting.on && styles.knobOn]} />
            </View>
          </Pressable>
        </View>
        {refused && (
          <View>
            <Text style={styles.problem} accessibilityLiveRegion="polite">
              {t(PUSH_NOT_ALLOWED)}
            </Text>
            <OpenSettings />
          </View>
        )}
        <View style={styles.field}>
          <Text style={styles.label}>{t("Alarm time")}</Text>
          <View style={styles.time}>
            <Stepper
              name={t("Hour")}
              shown={String(setting.hour)}
              onLess={() => keep({ hour: (setting.hour + 23) % 24 })}
              onMore={() => keep({ hour: (setting.hour + 1) % 24 })}
            />
            <Text style={styles.colon}>:</Text>
            <Stepper
              name={t("Minutes")}
              shown={String(setting.minute).padStart(2, "0")}
              onLess={() => keep({ minute: stepped(setting.minute, -MINUTE_STEP) })}
              onMore={() => keep({ minute: stepped(setting.minute, MINUTE_STEP) })}
            />
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t("Days")}</Text>
          <View style={styles.week}>
            {WEEK.map((day) => {
              const chosen = setting.days.includes(day);
              return (
                <Tap
                  key={day}
                  style={[styles.choice, styles.day, chosen && styles.chosen]}
                  onPress={() => toggleDay(day)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: chosen }}
                >
                  <Text style={[styles.choiceText, chosen && styles.chosenText]}>
                    {t(WEEKDAYS[day - 1])}
                  </Text>
                </Tap>
              );
            })}
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t("Length")}</Text>
          <View style={styles.choices} accessibilityRole="radiogroup">
            {MINUTES.map((minutes) => {
              const chosen = setting.minutes === minutes;
              return (
                <Tap
                  key={minutes}
                  style={[styles.choice, chosen && styles.chosen]}
                  onPress={() => keep({ minutes })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: chosen }}
                >
                  <Text style={[styles.choiceText, chosen && styles.chosenText]}>
                    {t("{minutes} min", { minutes })}
                  </Text>
                </Tap>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/** The minutes one step on or back, on the marks of the step, round the hour. */
export function stepped(minute: number, by: number): number {
  const marks = 60 / MINUTE_STEP;
  const at =
    by > 0 ? Math.floor(minute / MINUTE_STEP) : Math.ceil(minute / MINUTE_STEP);
  return ((((at + Math.sign(by)) % marks) + marks) % marks) * MINUTE_STEP;
}

/** A number between «−» and «+». */
function Stepper({
  name,
  shown,
  onLess,
  onMore,
}: {
  name: string;
  shown: string;
  onLess: () => void;
  onMore: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Tap
        style={styles.step}
        onPress={onLess}
        accessibilityRole="button"
        accessibilityLabel={`${name} −`}
      >
        <Text style={styles.stepText}>−</Text>
      </Tap>
      <Text style={styles.number} accessibilityLabel={`${name}, ${shown}`}>
        {shown}
      </Text>
      <Tap
        style={styles.step}
        onPress={onMore}
        accessibilityRole="button"
        accessibilityLabel={`${name} +`}
      >
        <Text style={styles.stepText}>+</Text>
      </Tap>
    </View>
  );
}

// The row as the others of «Settings» (`../settings/BodySetting`), the page
// as «Body» (`../settings/BodyPage`), the switch as «Notifications».
const styles = StyleSheet.create({
  menu: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  row: {
    minHeight: MIN_TAP_SIZE + space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.md,
  },
  pressed: {
    opacity: 0.6,
  },
  emoji: {
    fontSize: fontSize.input + space.xs,
  },
  rowText: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.medium,
  },
  value: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  page: {
    flex: 1,
    backgroundColor: color.background,
  },
  header: {
    minHeight: MIN_TAP_SIZE + space.sm,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.md,
    gap: space.md,
  },
  back: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
  },
  backText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  title: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
  },
  content: {
    gap: space.lg,
    padding: space.md,
  },
  intro: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  // Neutral: the yellow belongs to the route (docs/UI.md, «Il tema»).
  track: {
    width: 40,
    height: 24,
    justifyContent: "center",
    paddingHorizontal: 3,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  trackOn: {
    backgroundColor: color.text,
  },
  knob: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: color.textMuted,
  },
  knobOn: {
    alignSelf: "flex-end",
    backgroundColor: color.background,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.body,
  },
  field: {
    gap: space.sm,
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
  },
  time: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  colon: {
    color: color.textMuted,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  step: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  stepText: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  number: {
    minWidth: MIN_TAP_SIZE,
    textAlign: "center",
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  choices: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  choice: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  // The seven days on one row, each as wide as the others.
  week: {
    flexDirection: "row",
    gap: space.xs,
  },
  day: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 0,
  },
  chosen: {
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  choiceText: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  chosenText: {
    color: color.text,
    fontWeight: fontWeight.semibold,
  },
});
