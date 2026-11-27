import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

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
import { useReduceMotion } from "../ui/useReduceMotion";
import type { Category } from "./categories";
import { categoryName, todayLine } from "./categoryText";
import { PoseFigure } from "./CategoryTile";
import type { Composed } from "./compose";

/** How tall the figure of «Today» is, in points. */
export const TODAY_FIGURE = 120;
/** One slow pulse of the rings behind it, out and back. */
export const PULSE_MS = 3200;

type Props = {
  /** What is proposed now, and its routine as it would start. */
  of: Category;
  routine: Composed;
  /** The colour of the category's group. */
  tint: string;
  onStart: () => void;
  /** «See the exercises»: the category's page. */
  onSee: () => void;
};

/**
 * «Today» on the stretching home (TASK-520, ADR-0415): the one routine
 * proposed for this moment, the figure doing its first exercise inside two
 * rings that pulse, what it is in three labels, and the yellow «Start». The
 * yellow is on this button alone. With «Reduce Motion» on the rings stay
 * still.
 */
export function TodayCard({ of, routine, tint, onStart, onSee }: Props) {
  const reduced = useReduceMotion();
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) {
      pulse.setValue(0);
      return;
    }
    const half = {
      duration: PULSE_MS / 2,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
    };
    const beating = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { ...half, toValue: 1 }),
        Animated.timing(pulse, { ...half, toValue: 0 }),
      ]),
    );
    beating.start();
    return () => beating.stop();
  }, [pulse, reduced]);

  const line = todayLine(of.key);
  const count = routine.exercises.length;
  const labels = [
    t("{minutes} min", { minutes: routine.choice.minutes }),
    t("{count} exercises", { count }),
    routine.choice.level === "intense" ? t("Intense") : t("Gentle"),
  ];
  const outer = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const inner = pulse.interpolate({ inputRange: [0, 1], outputRange: [1.06, 0.96] });
  return (
    <View style={styles.card} testID="stretch-today">
      <View style={styles.top}>
        <View style={styles.words}>
          <Text style={[styles.eyebrow, { color: tint }]}>{t("Today")}</Text>
          <Text style={styles.name} accessibilityRole="header">
            {categoryName(of.key)}
          </Text>
          {line !== null && <Text style={styles.line}>{line}</Text>}
        </View>
        <View
          style={styles.stage}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          <Animated.View
            style={[
              styles.ring,
              styles.ringOuter,
              { borderColor: tint, transform: [{ scale: outer }] },
            ]}
          />
          <Animated.View
            style={[
              styles.ring,
              styles.ringInner,
              { backgroundColor: tint, transform: [{ scale: inner }] },
            ]}
          />
          <PoseFigure exercise={routine.exercises[0]} height={TODAY_FIGURE} breathing />
        </View>
      </View>
      <View style={styles.labels}>
        {labels.map((label) => (
          <View key={label} style={styles.label}>
            <Text style={styles.labelText}>{label}</Text>
          </View>
        ))}
      </View>
      <Tap
        style={styles.start}
        onPress={onStart}
        accessibilityRole="button"
        accessibilityLabel={`${t("Start")}, ${categoryName(of.key)}, ${labels.join(", ")}`}
        testID="stretch-today-start"
      >
        <Text style={styles.startText}>{t("Start")}</Text>
      </Tap>
      <Tap
        style={styles.see}
        onPress={onSee}
        accessibilityRole="button"
        testID="stretch-today-see"
      >
        <Text style={styles.seeText}>{t("See the {count} exercises", { count })}</Text>
      </Tap>
    </View>
  );
}

const STAGE = TODAY_FIGURE + space.xl;

const styles = StyleSheet.create({
  card: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  words: {
    flex: 1,
    gap: space.xs,
  },
  eyebrow: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    letterSpacing: tracking.label,
    textTransform: "uppercase",
  },
  name: {
    color: color.text,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
  },
  line: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  stage: {
    width: STAGE,
    height: STAGE,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  ring: {
    position: "absolute",
    top: 0,
    left: 0,
    width: STAGE,
    height: STAGE,
    borderRadius: radius.pill,
  },
  ringOuter: {
    borderWidth: 2,
    opacity: 0.35,
  },
  ringInner: {
    opacity: 0.14,
  },
  labels: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  label: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  labelText: {
    color: color.text,
    fontSize: fontSize.detail,
    fontWeight: fontWeight.medium,
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
  see: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  seeText: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
  },
});
