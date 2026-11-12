import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { t } from "../i18n";
import { useRunAwake } from "../navigation/useRunAwake";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { chime, tick } from "./chime";
import { type Exercise, EXERCISES, READY_S, SWITCH_S } from "./exercises";
import { Figure } from "./Figure";

/**
 * The stretching after a run (TASK-285 part B, ADR-0247; the flow of
 * TASK-466 part A, ADR-0378): exercises one after the other, each with the figure
 * doing it, a line on how, and a countdown.
 *
 * Each exercise starts with «Get ready» (`READY_S`), while the figure goes
 * down into the pose; the hold's time starts only then, with a tick. The
 * last seconds of a hold tick too, and a bell rings at its end. An
 * exercise held on each side gets a shorter «Switch sides» (`SWITCH_S`)
 * while the figure stands up, turns round and goes down again. Near the
 * end of an exercise the next one is named. «Pause» holds the time,
 * «Skip» goes on to the next exercise, «End» leaves for «Your run» at any
 * moment, and so does «Done» on the last one.
 */

/** The countdown's step. */
export const TICK_MS = 1000;
/** «Get ready» and «Switch sides», in seconds: kept with the exercises,
 * where a routine's length is counted. */
export { READY_S, SWITCH_S };
/** The last seconds of a hold that tick. */
export const COUNT_IN_S = 3;
/** How near the end of an exercise the next one is named, in seconds. */
export const NEXT_SHOWN_S = 5;
/** How often the time left is said to a screen reader. */
export const SAID_EVERY_S = 10;

type Props = {
  /** The stretching is over, skipped or done: on to «Your run». */
  onLeave: () => void;
  exercises?: readonly Exercise[];
};

/** "0:20", "1:05": the seconds left as a clock. */
export function clockLabel(seconds: number): string {
  const s = Math.max(0, seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Getting into the pose, or holding it. */
type Phase = "ready" | "hold";

/** Where the routine is: which exercise, which side, what, how long still. */
type Step = { index: number; side: 0 | 1; phase: Phase; left: number };

/** The start of exercise `index`: «Get ready» on its first side. */
function start(index: number): Step {
  return { index, side: 0, phase: "ready", left: READY_S };
}

/** How long the phase of `step` lasts in all. */
function phaseSeconds(step: Step, exercise: Exercise): number {
  if (step.phase === "hold") {
    return exercise.seconds;
  }
  return step.side === 1 ? SWITCH_S : READY_S;
}

export function StretchScreen({ onLeave, exercises = EXERCISES }: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const [step, setStep] = useState<Step>(() => start(0));
  const [paused, setPaused] = useState(false);
  const exercise = exercises[step.index];
  const next = exercises[step.index + 1];
  const last = next === undefined;

  // Where the timer is, kept by the timer itself: two ticks may fire before
  // React has drawn the first (under jest they do), and the second must
  // count from the first. The screen follows it through `step`.
  const now = useRef(step);
  const leave = useRef(onLeave);
  useEffect(() => {
    leave.current = onLeave;
  }, [onLeave]);

  useRunAwake(true);

  /** The timer moves on: what it reads next, and what the screen shows. */
  const go = useCallback((to: Step) => {
    now.current = to;
    setStep(to);
  }, []);

  /** The phase is over: the hold, the other side, the next exercise, or the end. */
  const advance = useCallback(
    (from: Step) => {
      const done = exercises[from.index];
      if (from.phase === "ready") {
        tick();
        go({ ...from, phase: "hold", left: done.seconds });
        return;
      }
      chime();
      if (done.sides && from.side === 0) {
        go({ index: from.index, side: 1, phase: "ready", left: SWITCH_S });
        AccessibilityInfo.announceForAccessibility(t("Switch sides"));
        return;
      }
      if (from.index + 1 < exercises.length) {
        go(start(from.index + 1));
        AccessibilityInfo.announceForAccessibility(t(exercises[from.index + 1].name));
        return;
      }
      go({ ...from, left: 0 });
      leave.current();
    },
    [exercises, go],
  );

  // The countdown: one second at a time while not paused.
  useEffect(() => {
    if (paused) {
      return;
    }
    const timer = setInterval(() => {
      const at = now.current;
      if (at.left > 1) {
        go({ ...at, left: at.left - 1 });
        if (at.phase === "hold" && at.left - 1 <= COUNT_IN_S) {
          tick();
        }
      } else if (at.left === 1) {
        advance(at);
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [paused, advance, go]);

  // The time left, now and then, for a screen reader.
  useEffect(() => {
    if (
      step.phase === "hold" &&
      step.left > 0 &&
      step.left % SAID_EVERY_S === 0 &&
      step.left < exercise.seconds
    ) {
      AccessibilityInfo.announceForAccessibility(
        t("{seconds} seconds left", { seconds: step.left }),
      );
    }
  }, [step.phase, step.left, exercise.seconds]);

  /** «Skip»: straight to the next exercise's «Get ready». */
  const skip = useCallback(() => {
    if (next === undefined) {
      return;
    }
    go(start(step.index + 1));
    AccessibilityInfo.announceForAccessibility(t(next.name));
  }, [go, next, step.index]);

  const sideLabel = exercise.sides
    ? step.side === 0
      ? t("Right side")
      : t("Left side")
    : null;
  const holding = step.phase === "hold";
  const phaseLabel = holding
    ? null
    : step.side === 1
      ? t("Switch sides")
      : t("Get ready");
  // The next exercise, named in the last seconds of this one's last side.
  const lastSide = !exercise.sides || step.side === 1;
  const nextLabel =
    holding && lastSide && next !== undefined && step.left <= NEXT_SHOWN_S
      ? t("Next: {exercise}", { exercise: t(next.name) })
      : null;
  const total = phaseSeconds(step, exercise);
  const figureHeight = Math.min(360, windowHeight * 0.4);

  return (
    <Modal
      visible
      animationType="fade"
      statusBarTranslucent
      // Android's back button leaves, as «End» does.
      onRequestClose={onLeave}
    >
      <StatusBar hidden />
      <View style={styles.screen} testID="stretch-screen">
        <View style={styles.top}>
          <Text style={styles.count}>
            {t("{index} of {total}", {
              index: step.index + 1,
              total: exercises.length,
            })}
          </Text>
          <Text style={styles.name} accessibilityRole="header">
            {t(exercise.name)}
          </Text>
          <Text style={styles.howTo}>{t(exercise.howTo)}</Text>
          {sideLabel !== null && <Text style={styles.side}>{sideLabel}</Text>}
        </View>
        <Figure
          pose={exercise.pose}
          breath={exercise.breath}
          breathing={holding && !paused}
          height={figureHeight}
          mirrored={step.side === 1}
          testID="stretch-figure"
        />
        <View style={styles.bottom}>
          <Text style={styles.phase}>{phaseLabel ?? nextLabel ?? " "}</Text>
          <Text
            style={[styles.clock, !holding && styles.clockReady]}
            accessibilityRole="timer"
            accessibilityLabel={t("{seconds} seconds left", { seconds: step.left })}
          >
            {clockLabel(step.left)}
          </Text>
          <View style={styles.bar} accessible={false}>
            <View
              style={[styles.barLeft, !holding && styles.barReady, { flex: step.left }]}
            />
            <View style={{ flex: total - step.left }} />
          </View>
          <View style={styles.buttons}>
            <Pressable
              style={styles.button}
              onPress={() => setPaused((p) => !p)}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>{paused ? t("Resume") : t("Pause")}</Text>
            </Pressable>
            {!last && (
              <Pressable
                style={styles.button}
                onPress={skip}
                accessibilityRole="button"
              >
                <Text style={styles.buttonText}>{t("Skip")}</Text>
              </Pressable>
            )}
            <Pressable
              style={styles.button}
              onPress={onLeave}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>{last ? t("Done") : t("End")}</Text>
            </Pressable>
          </View>
          <Text style={styles.care}>{t("Stop if it hurts.")}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: space.xxl * 2,
    paddingBottom: space.xxl,
    paddingHorizontal: space.xl,
    backgroundColor: color.background,
  },
  top: {
    gap: space.sm,
  },
  count: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  name: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  howTo: {
    color: color.textMuted,
    fontSize: fontSize.body,
    lineHeight: fontSize.body * 1.4,
  },
  side: {
    color: color.accent,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  bottom: {
    gap: space.md,
    alignItems: "center",
  },
  phase: {
    color: color.accent,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    textAlign: "center",
  },
  clock: {
    color: color.text,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  clockReady: {
    color: color.textMuted,
  },
  bar: {
    alignSelf: "stretch",
    flexDirection: "row",
    height: space.sm,
    borderRadius: space.sm / 2,
    overflow: "hidden",
    backgroundColor: color.surfaceRaised,
  },
  barLeft: {
    backgroundColor: color.accent,
  },
  barReady: {
    backgroundColor: color.textFaint,
  },
  buttons: {
    alignSelf: "stretch",
    flexDirection: "row",
    justifyContent: "center",
    gap: space.sm,
  },
  button: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  care: {
    color: color.textFaint,
    fontSize: fontSize.small,
  },
});
