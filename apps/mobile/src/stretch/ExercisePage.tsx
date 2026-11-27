import { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
  tracking,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { isMove } from "./allExercises";
import { categoryName } from "./categoryText";
import { PoseFigure } from "./CategoryTile";
import { DotRing, litDots } from "./DotRing";
import type { Exercise } from "./exercises";
import { goodFor } from "./goodFor";
import { clockLabel, StretchScreen, TICK_MS } from "./StretchScreen";

/** How long a breath in, or out, is said for, in seconds. */
export const BREATH_S = 4;
/** «Try it»: how long, in minutes. */
export const TRY_MINUTES = 1;
/** The ring's side and the figure's height in it, in points. */
const RING = 260;
const FIGURE = 150;

type Props = {
  /** The exercise, with the time it has in the routine it was opened from. */
  exercise: Exercise;
  /** The colour of the category it was opened from. */
  tint: string;
  onClose: () => void;
};

/** The exercise for one minute: half a minute a side when it has two. */
export function tryOf(exercise: Exercise): Exercise {
  const whole = TRY_MINUTES * 60;
  return { ...exercise, seconds: exercise.sides ? whole / 2 : whole };
}

/**
 * An exercise's page (TASK-520 part E, ADR-0415), opened from a row of a
 * category's page: the figure doing it again and again inside a ring of
 * dots that go out with the seconds, the time in large, the side and the
 * breath, a pause; then what it is in three boxes (its hold, its sides,
 * where it is done), how to do it, what it is good for, and «Try it», the
 * exercise alone for a minute on the stretching screen. The page shows; it
 * keeps no session. At the end of its time it begins again, on the other
 * side when it has two.
 */
export function ExercisePage({ exercise, tint, onClose }: Props) {
  // The seconds left of this side, and which side it is.
  const [{ left, side }, setClock] = useState({ left: exercise.seconds, side: 0 });
  const [playing, setPlaying] = useState(true);
  const [trying, setTrying] = useState(false);
  useEffect(() => {
    if (!playing || trying) {
      return;
    }
    const timer = setInterval(() => {
      setClock((now) =>
        now.left > 0
          ? { ...now, left: now.left - 1 }
          : // Again from the top, on the other side when it has two.
            { left: exercise.seconds, side: exercise.sides ? 1 - now.side : 0 },
      );
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [exercise.seconds, exercise.sides, playing, trying]);

  const move = isMove(exercise);
  const elapsed = exercise.seconds - left;
  const breath =
    Math.floor(elapsed / BREATH_S) % 2 === 1 ? t("Breathe out") : t("Breathe in");
  const sideLabel = exercise.sides
    ? side === 0
      ? t("Right side")
      : t("Left side")
    : null;
  // A movement has its own pace: no breath to follow.
  const under = [sideLabel, move ? null : breath].filter(Boolean).join(" · ");
  const where =
    exercise.position === "floor"
      ? t("Floor")
      : exercise.position === "chair"
        ? t("Chair")
        : t("Standing");
  const boxes = [
    { label: t("Hold"), value: t("{seconds} s", { seconds: exercise.seconds }) },
    { label: t("Sides"), value: exercise.sides ? t("Both") : t("One") },
    { label: t("Position"), value: where },
  ];
  const toggle = playing ? t("Pause") : t("Play@@timer");

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.page} testID="stretch-exercise">
        <View style={styles.bar}>
          <Tap
            style={styles.round}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t("Close")}
            testID="stretch-exercise-close"
          >
            <Text style={styles.roundText}>✕</Text>
          </Tap>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title} accessibilityRole="header">
            {t(exercise.name)}
          </Text>
          <View style={styles.stage}>
            <DotRing
              size={RING}
              lit={litDots(left, exercise.seconds)}
              tint={tint}
              testID="stretch-ring"
            >
              <PoseFigure
                exercise={exercise}
                height={FIGURE}
                breathing={playing}
                mirrored={side === 1}
              />
            </DotRing>
          </View>
          <View style={styles.time}>
            <Text
              style={styles.clock}
              accessibilityRole="timer"
              accessibilityLabel={t("{seconds} seconds left", { seconds: left })}
              testID="stretch-exercise-clock"
            >
              {clockLabel(left)}
            </Text>
            <Tap
              style={styles.round}
              onPress={() => setPlaying((on) => !on)}
              accessibilityRole="button"
              accessibilityLabel={toggle}
              testID="stretch-exercise-toggle"
            >
              <Text style={styles.roundText}>{playing ? "❚❚" : "▶"}</Text>
            </Tap>
          </View>
          {under !== "" && (
            <Text
              style={[styles.under, { color: tint }]}
              testID="stretch-exercise-under"
            >
              {under}
            </Text>
          )}

          <View style={styles.boxes}>
            {boxes.map((box) => (
              <View
                key={box.label}
                style={styles.box}
                accessible
                accessibilityLabel={`${box.label}: ${box.value}`}
              >
                <Text style={styles.boxLabel}>{box.label}</Text>
                <Text style={styles.boxValue}>{box.value}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.section} accessibilityRole="header">
            {t("How to")}
          </Text>
          <Text style={styles.howTo}>{t(exercise.howTo)}</Text>

          <Text style={styles.section} accessibilityRole="header">
            {t("Good for")}
          </Text>
          <View style={styles.chips} testID="stretch-good-for">
            {goodFor(exercise.key).map((key) => (
              <View key={key} style={styles.chip}>
                <Text style={styles.chipText}>{categoryName(key)}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.stop}>{t("Stop if it hurts.")}</Text>
        </ScrollView>
        <View style={styles.foot}>
          <Tap
            style={styles.start}
            onPress={() => setTrying(true)}
            accessibilityRole="button"
            testID="stretch-exercise-try"
          >
            <Text style={styles.startText}>
              {t("Try it · {minutes} min", { minutes: TRY_MINUTES })}
            </Text>
          </Tap>
        </View>
        {trying && (
          <StretchScreen
            exercises={[tryOf(exercise)]}
            onLeave={() => setTrying(false)}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: color.background,
  },
  bar: {
    paddingTop: space.xxl * 1.5,
    paddingHorizontal: space.lg,
    alignItems: "flex-end",
  },
  round: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  roundText: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  content: {
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
  },
  title: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    letterSpacing: tracking.title,
  },
  stage: {
    alignItems: "center",
  },
  time: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.lg,
  },
  clock: {
    color: color.text,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  under: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    textAlign: "center",
  },
  boxes: {
    flexDirection: "row",
    gap: space.sm,
  },
  box: {
    flex: 1,
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  boxLabel: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: tracking.label,
    textTransform: "uppercase",
  },
  boxValue: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
  },
  section: {
    marginTop: space.sm,
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: tracking.label,
    textTransform: "uppercase",
  },
  howTo: {
    color: color.text,
    fontSize: fontSize.body,
    lineHeight: fontSize.body * 1.45,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  chipText: {
    color: color.text,
    fontSize: fontSize.detail,
    fontWeight: fontWeight.medium,
  },
  stop: {
    marginTop: space.sm,
    color: color.textFaint,
    fontSize: fontSize.small,
    textAlign: "center",
  },
  foot: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xxl,
    backgroundColor: color.background,
  },
  start: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.accent,
  },
  startText: {
    color: color.onAccent,
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
  },
});
