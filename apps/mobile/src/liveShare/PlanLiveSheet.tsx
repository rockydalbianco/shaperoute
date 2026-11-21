import type { PlannedLiveAudience } from "@shaperoute/shared-types";
import { useState } from "react";
import { Modal, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { t } from "../i18n";
import { runActivityOf } from "../settings/sport";
import { useSport } from "../settings/useSport";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { type LiveApiOptions, planLive } from "./liveShareApi";

/** A step of the time, in minutes. */
export const TIME_STEP_MIN = 15;
/** As far ahead as the API takes (PLANNED_LIVE_LATEST_DAYS). */
export const LATEST_DAYS = 60;

/** Tomorrow at 9:00, the phone's time: a race's morning. */
export function firstStart(now: Date = new Date()): Date {
  const at = new Date(now);
  at.setDate(at.getDate() + 1);
  at.setHours(9, 0, 0, 0);
  return at;
}

/** A day more or less, the time kept; never before now nor past the last
 * day the API takes. */
export function movedDay(at: Date, days: number, now: Date = new Date()): Date {
  const next = new Date(at);
  next.setDate(next.getDate() + days);
  const latest = new Date(now.getTime() + LATEST_DAYS * 86_400_000);
  return next < now || next > latest ? at : next;
}

/** TIME_STEP_MIN more or less, on the same day; never before now. */
export function movedTime(at: Date, steps: number, now: Date = new Date()): Date {
  const next = new Date(at.getTime() + steps * TIME_STEP_MIN * 60_000);
  return next.getDate() !== at.getDate() || next < now ? at : next;
}

type Props = {
  api: LiveApiOptions;
  onClose: () => void;
  /** The live planned: the row reads its lives again. */
  onPlanned: () => void;
  /** For the tests: the clock. */
  now?: () => Date;
};

/**
 * «Plan a live» (TASK-468 part B2b1, ADR-0381; the user's choices 1, 4 and 9;
 * texts approved by the user on 2026-11-12): a race say, made in advance
 * from the Feed. The sport of «Settings», a name, the day and the time (with
 * steps, no picker: no new dependency), who can follow, the heart rate (off
 * unless turned on). The API refuses a name the comment filter refuses.
 */
export function PlanLiveSheet(props: Props) {
  return (
    <Modal visible animationType="slide" onRequestClose={props.onClose}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Plan {...props} />
      </SafeAreaProvider>
    </Modal>
  );
}

function Plan({ api, onClose, onPlanned, now = () => new Date() }: Props) {
  const insets = useSafeAreaInsets();
  const activity = runActivityOf(useSport());
  const [title, setTitle] = useState("");
  const [at, setAt] = useState(() => firstStart(now()));
  const [audience, setAudience] = useState<PlannedLiveAudience>("followers");
  const [heart, setHeart] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const ready = title.trim() !== "" && !busy;

  async function plan() {
    setBusy(true);
    setProblem(null);
    const answer = await planLive(api, {
      activity,
      title: title.trim(),
      starts_at: at.toISOString(),
      audience_feed: audience,
      heart_visible: heart,
    });
    setBusy(false);
    if (answer.kind === "ok") {
      onPlanned();
      onClose();
      return;
    }
    setProblem(t("Couldn't plan the live. Try again."));
  }

  const day = at.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const time = at.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.md },
      ]}
    >
      <Text style={styles.title} accessibilityRole="header">
        {t("Plan a live")}
      </Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder={t("Name (e.g. Milano Marathon)")}
        placeholderTextColor={color.textFaint}
        maxLength={60}
        accessibilityLabel={t("Name (e.g. Milano Marathon)")}
        testID="plan-live-title"
      />
      <Text style={styles.label}>{t("Day and time")}</Text>
      <Stepper
        value={day}
        onLess={() => setAt((was) => movedDay(was, -1, now()))}
        onMore={() => setAt((was) => movedDay(was, 1, now()))}
        testID="plan-live-day"
      />
      <Stepper
        value={time}
        onLess={() => setAt((was) => movedTime(was, -1, now()))}
        onMore={() => setAt((was) => movedTime(was, 1, now()))}
        testID="plan-live-time"
      />
      <Text style={styles.label}>{t("Who can follow")}</Text>
      <View style={styles.choices}>
        {(["followers", "everyone"] as const).map((one) => (
          <Tap
            key={one}
            style={[styles.choice, audience === one && styles.chosen]}
            onPress={() => setAudience(one)}
            accessibilityRole="radio"
            accessibilityState={{ selected: audience === one }}
            testID={`plan-live-${one}`}
          >
            <Text style={[styles.choiceText, audience === one && styles.chosenText]}>
              {one === "followers" ? t("Followers") : t("Everyone")}
            </Text>
          </Tap>
        ))}
      </View>
      <View style={styles.heartRow}>
        <View style={styles.heartWords}>
          <Text style={styles.heartTitle}>{t("Show my heart rate")}</Text>
          <Text style={styles.note}>
            {t(
              "Off: nobody sees your heart rate. On: they see it when a watch sends it.",
            )}
          </Text>
        </View>
        <Switch
          value={heart}
          onValueChange={setHeart}
          accessibilityLabel={t("Show my heart rate")}
          testID="plan-live-heart"
        />
      </View>
      {problem !== null && (
        <Text style={styles.problem} accessibilityRole="alert">
          {problem}
        </Text>
      )}
      <View style={styles.fill} />
      <View style={styles.buttons}>
        <Tap style={styles.button} onPress={onClose} accessibilityRole="button">
          <Text style={styles.buttonText}>{t("Not now")}</Text>
        </Tap>
        <Tap
          style={[styles.button, styles.primary, !ready && styles.off]}
          onPress={() => void plan()}
          disabled={!ready}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready, busy }}
          testID="plan-live-plan"
        >
          <Text style={[styles.buttonText, styles.primaryText]}>{t("Plan")}</Text>
        </Tap>
      </View>
    </View>
  );
}

function Stepper({
  value,
  onLess,
  onMore,
  testID,
}: {
  value: string;
  onLess: () => void;
  onMore: () => void;
  testID: string;
}) {
  return (
    <View style={styles.stepper} testID={testID}>
      <Tap
        style={styles.step}
        onPress={onLess}
        accessibilityRole="button"
        accessibilityLabel="−"
      >
        <Text style={styles.stepText}>−</Text>
      </Tap>
      <Text style={styles.value} accessibilityLiveRegion="polite">
        {value}
      </Text>
      <Tap
        style={styles.step}
        onPress={onMore}
        accessibilityRole="button"
        accessibilityLabel="+"
      >
        <Text style={styles.stepText}>+</Text>
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: space.md,
    paddingHorizontal: space.lg,
    backgroundColor: color.background,
  },
  title: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  input: {
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
    color: color.text,
    fontSize: fontSize.input,
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  step: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  stepText: {
    color: color.text,
    fontSize: fontSize.title,
  },
  value: {
    flex: 1,
    textAlign: "center",
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  choices: {
    flexDirection: "row",
    gap: space.sm,
  },
  choice: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  chosen: {
    borderColor: color.text,
    backgroundColor: color.text,
  },
  choiceText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  chosenText: {
    color: color.background,
  },
  heartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  heartWords: {
    flex: 1,
    gap: space.xs,
  },
  heartTitle: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  note: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.body,
  },
  fill: {
    flex: 1,
  },
  buttons: {
    flexDirection: "row",
    gap: space.sm,
  },
  button: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  primary: {
    borderColor: color.text,
    backgroundColor: color.text,
  },
  off: {
    opacity: 0.5,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  primaryText: {
    color: color.background,
  },
});
