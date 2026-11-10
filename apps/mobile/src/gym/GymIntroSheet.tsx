import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t, tLater } from "../i18n";
import {
  color,
  font,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { SheetModal } from "../ui/SheetModal";

/** The three steps, with their lines (texts approved on 2026-11-10). */
export const INTRO_STEPS: readonly { title: string; line: string }[] = [
  {
    title: tLater("Choose your goal and days"),
    line: tLater(
      "More muscle, more strength, tone up or get back in shape, 2 to 5 days.",
    ),
  },
  {
    title: tLater("The plan is ready"),
    line: tLater("Exercises, sets and reps proposed: touch an exercise to change it."),
  },
  {
    title: tLater("The weeks change by themselves"),
    line: tLater("More load, more reps or weeks A / B. Here you find today's workout."),
  },
];

/** The four weeks of the cycle as bars: three that grow, one lighter. */
const BARS = [0.55, 0.75, 1, 0.4];

/**
 * «Your plan, step by step» (TASK-433 B, the mockup «B» approved on
 * 2026-11-10): a sheet from the bottom over «Draw» with the weeks as bars,
 * three steps, «Create my plan», which opens the guide, and «Not now».
 * Without an account there is no plan to make: «Not now» only.
 */
export function GymIntroSheet({
  visible,
  onCreate,
  onClose,
  onHidden,
}: {
  visible: boolean;
  /** Null without an account. */
  onCreate: (() => void) | null;
  onClose: () => void;
  /** Down and gone: the guide opens only then, one Modal at a time. */
  onHidden?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <SheetModal
      visible={visible}
      onRequestClose={onClose}
      onHidden={onHidden}
      dim
      testID="gym-intro"
    >
      <View style={styles.backdrop}>
        <Pressable
          style={styles.outside}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("Not now")}
          testID="gym-intro-outside"
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={styles.handle} />
          <View style={styles.bars} accessibilityElementsHidden>
            {BARS.map((height, index) => (
              <View
                key={index}
                style={[
                  styles.bar,
                  { height: 60 * height },
                  index === BARS.length - 1 && styles.barLight,
                ]}
              />
            ))}
          </View>
          <View style={styles.heading}>
            <Text style={styles.title} accessibilityRole="header">
              {t("Your plan, step by step")}
            </Text>
            <Text style={styles.lead}>
              {t("A minute to make it, then it guides you every time.")}
            </Text>
          </View>
          <View style={styles.steps}>
            {INTRO_STEPS.map((step, index) => (
              <View key={step.title} style={styles.step}>
                <Text style={styles.number} importantForAccessibility="no">
                  {index + 1}
                </Text>
                <View style={styles.stepText}>
                  <Text style={styles.stepTitle}>{t(step.title)}</Text>
                  <Text style={styles.stepLine}>{t(step.line)}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={styles.buttons}>
            {onCreate !== null && (
              <Pressable
                style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
                onPress={onCreate}
                accessibilityRole="button"
                testID="gym-intro-create"
              >
                <Text style={styles.primaryText}>{t("Create my plan")}</Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.link, pressed && styles.pressed]}
              onPress={onClose}
              accessibilityRole="button"
              testID="gym-intro-close"
            >
              <Text style={styles.linkText}>{t("Not now")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SheetModal>
  );
}

const NUMBER = 32;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  outside: {
    flex: 1,
  },
  sheet: {
    gap: space.lg,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: color.border,
  },
  bars: {
    alignSelf: "center",
    width: 180,
    height: 60,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space.sm,
  },
  bar: {
    flex: 1,
    borderRadius: 6,
    backgroundColor: color.accent,
  },
  barLight: {
    backgroundColor: color.borderStrong,
  },
  heading: {
    gap: space.xs,
  },
  title: {
    color: color.text,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  lead: {
    ...font.body,
    color: color.textMuted,
    textAlign: "center",
  },
  steps: {
    gap: space.md,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
  },
  number: {
    width: NUMBER,
    height: NUMBER,
    lineHeight: NUMBER,
    borderRadius: NUMBER / 2,
    overflow: "hidden",
    textAlign: "center",
    backgroundColor: color.surfaceRaised,
    color: color.accent,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  stepText: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    color: color.text,
    fontSize: 16,
    fontWeight: fontWeight.semibold,
  },
  stepLine: {
    ...font.small,
    color: color.textMuted,
  },
  buttons: {
    gap: space.xs,
  },
  primary: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.accent,
  },
  primaryText: {
    color: color.onAccent,
    fontSize: 17,
    fontWeight: fontWeight.bold,
  },
  link: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  linkText: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  pressed: {
    opacity: 0.7,
  },
});
