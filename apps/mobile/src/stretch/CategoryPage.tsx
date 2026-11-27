import { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { startCategorySession } from "../stretchSport/StretchSessionHost";
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
import {
  BACK_CATEGORIES,
  categoryName,
  pairOf,
  SPORT_NAMES,
  type When,
} from "./categoryText";
import { category, type Choice, compose, settle } from "./compose";
import { ExercisePage } from "./ExercisePage";
import type { Exercise } from "./exercises";
import { choiceFor, rememberChoice, useChoices } from "./stretchChoices";

type Props = {
  /** The category opened; for a sport or intimacy, its «Before» or «After». */
  categoryKey: string;
  onClose: () => void;
};

/** A choice among a few, one on: lengths, gentle or intense, where. */
function Choices<T extends string | number>({
  label,
  options,
  on,
  tint,
  onChoose,
  testID,
}: {
  label: string;
  options: readonly { value: T; text: string; offered: boolean }[];
  on: T;
  tint: string;
  onChoose: (value: T) => void;
  testID: string;
}) {
  return (
    <View
      style={styles.choices}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      testID={testID}
    >
      {options.map((option) => {
        const chosen = option.value === on;
        return (
          <Tap
            key={String(option.value)}
            style={[
              styles.choice,
              chosen && { borderColor: tint },
              !option.offered && styles.choiceOff,
            ]}
            disabled={!option.offered}
            onPress={() => onChoose(option.value)}
            accessibilityRole="radio"
            accessibilityLabel={option.text}
            accessibilityState={{ checked: chosen, disabled: !option.offered }}
            testID={`${testID}-${option.value}`}
          >
            <Text
              style={[
                styles.choiceText,
                chosen && { color: tint },
                !option.offered && styles.choiceTextOff,
              ]}
            >
              {option.text}
            </Text>
          </Tap>
        );
      })}
    </View>
  );
}

/**
 * A stretching category's page (TASK-520, ADR-0415): how long, gentle or
 * intense, with a mat or standing only, and under them the routine those
 * choices make, exercise by exercise, with «Start». A sport and intimacy
 * have «Before» and «After» at the top. A choice the category does not have
 * for the others made is shown off: nothing is asked that there is not
 * (`compose.ts`). «Start» keeps the choice for the next time and opens the
 * stretching screen on that routine. A row opens that exercise's page
 * (part E).
 */
export function CategoryPage({ categoryKey, onClose }: Props) {
  const choices = useChoices();
  const [key, setKey] = useState(categoryKey);
  const of = category(key);
  const [asked, setAsked] = useState<Choice | null>(null);
  // The exercise whose page is open, with its time in this routine.
  const [shown, setShown] = useState<Exercise | null>(null);
  const choice = asked === null ? choiceFor(of, choices) : settle(of, asked);
  const routine = compose(of, choice);
  const tint = color.stretch[of.group];
  const pair = pairOf(key);

  const has = (change: Partial<Choice>) => {
    const next = settle(of, { ...choice, ...change });
    return (Object.keys(change) as (keyof Choice)[]).every(
      (field) => next[field] === change[field],
    );
  };
  const choose = (change: Partial<Choice>) => setAsked({ ...choice, ...change });
  const turn = (when: When) => {
    if (pair !== null) {
      setKey(`${pair.of}_${when}`);
      setAsked(null);
    }
  };
  const start = () => {
    rememberChoice(of, routine.choice);
    startCategorySession(of.key, routine.choice.minutes, routine.exercises);
    onClose();
  };

  const title =
    pair === null
      ? categoryName(key)
      : SPORT_NAMES[pair.of] !== undefined
        ? t(SPORT_NAMES[pair.of])
        : t("Intimacy");
  const warmUp =
    pair?.when === "before" && routine.exercises.some((exercise) => isMove(exercise));
  const whole = routine.exercises.reduce(
    (sum, exercise) => sum + exercise.seconds * (exercise.sides ? 2 : 1),
    0,
  );
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.page} testID="stretch-category">
        <View style={styles.bar}>
          <Tap
            style={styles.close}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t("Close")}
            testID="stretch-category-close"
          >
            <Text style={styles.closeText}>✕</Text>
          </Tap>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {pair !== null && (
            <Choices
              label={title}
              options={[
                { value: "before", text: t("Before"), offered: true },
                { value: "after", text: t("After"), offered: true },
              ]}
              on={pair.when}
              tint={tint}
              onChoose={turn}
              testID="stretch-when"
            />
          )}
          <Text style={styles.section}>{t("Length")}</Text>
          <Choices
            label={t("Length")}
            options={of.minutes.map((minutes) => ({
              value: minutes,
              text: t("{minutes} min", { minutes }),
              offered: has({ minutes }),
            }))}
            on={choice.minutes}
            tint={tint}
            onChoose={(minutes) => choose({ minutes })}
            testID="stretch-minutes"
          />
          <Choices
            label={`${t("Gentle")} · ${t("Intense")}`}
            options={[
              { value: "gentle", text: t("Gentle"), offered: has({ level: "gentle" }) },
              {
                value: "intense",
                text: t("Intense"),
                offered: has({ level: "intense" }),
              },
            ]}
            on={choice.level}
            tint={tint}
            onChoose={(level) => choose({ level })}
            testID="stretch-level"
          />
          <Choices
            label={`${t("Standing only")} · ${t("Standing + floor")}`}
            options={[
              {
                value: "standing",
                text: t("Standing only"),
                offered: has({ where: "standing" }),
              },
              {
                value: "any",
                text: t("Standing + floor"),
                offered: has({ where: "any" }),
              },
            ]}
            on={choice.where}
            tint={tint}
            onChoose={(where) => choose({ where })}
            testID="stretch-where"
          />

          <View style={styles.summary} testID="stretch-summary">
            <Text style={styles.summaryText}>
              {t("{minutes} min · {count} exercises", {
                minutes: routine.choice.minutes,
                count: routine.exercises.length,
              })}
            </Text>
            <Text style={styles.kind}>
              {warmUp ? t("Moving warm-up") : t("Held stretches")}
            </Text>
            {/* Each exercise's share of the time, in the order they are done. */}
            <View style={styles.weights} accessible={false}>
              {routine.exercises.map((exercise, i) => (
                <View
                  key={`${exercise.key}-${i}`}
                  style={[
                    styles.weight,
                    {
                      flex: (exercise.seconds * (exercise.sides ? 2 : 1)) / whole,
                      backgroundColor: tint,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
          {BACK_CATEGORIES.includes(of.key) && (
            <Text style={styles.care}>
              {t("This is not medical advice. If your back hurts, see a doctor.")}
            </Text>
          )}

          <View style={styles.list}>
            {routine.exercises.map((exercise, i) => (
              <Tap
                key={`${exercise.key}-${i}`}
                style={styles.row}
                onPress={() => setShown(exercise)}
                accessibilityRole="button"
                accessibilityLabel={`${i + 1}. ${t(exercise.name)}`}
                testID={`stretch-row-${i}`}
              >
                <View style={styles.rail}>
                  <View style={[styles.number, { borderColor: tint }]}>
                    <Text style={[styles.numberText, { color: tint }]}>{i + 1}</Text>
                  </View>
                  {i < routine.exercises.length - 1 && <View style={styles.line} />}
                </View>
                <View style={styles.rowWords}>
                  <Text style={styles.rowName}>{t(exercise.name)}</Text>
                  <Text style={styles.rowTime}>
                    {exercise.sides
                      ? t("{seconds} s each side", { seconds: exercise.seconds })
                      : t("{seconds} s", { seconds: exercise.seconds })}
                  </Text>
                </View>
              </Tap>
            ))}
          </View>
          <Text style={styles.stop}>{t("Stop if it hurts.")}</Text>
        </ScrollView>
        <View style={styles.foot}>
          <Tap
            style={styles.start}
            onPress={start}
            accessibilityRole="button"
            accessibilityLabel={`${t("Start")}, ${categoryName(key)}`}
            testID="stretch-category-start"
          >
            <Text style={styles.startText}>{t("Start")}</Text>
          </Tap>
        </View>
        {shown !== null && (
          <ExercisePage exercise={shown} tint={tint} onClose={() => setShown(null)} />
        )}
      </View>
    </Modal>
  );
}

const NUMBER = 28;

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
  close: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  closeText: {
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
  section: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: tracking.label,
    textTransform: "uppercase",
  },
  choices: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  choice: {
    flexGrow: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  choiceOff: {
    opacity: 0.4,
  },
  choiceText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  choiceTextOff: {
    color: color.textMuted,
  },
  summary: {
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  summaryText: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
  },
  kind: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  weights: {
    flexDirection: "row",
    gap: 2,
    height: space.sm,
    marginTop: space.xs,
  },
  weight: {
    borderRadius: radius.pill,
  },
  care: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  list: {
    marginTop: space.sm,
  },
  row: {
    flexDirection: "row",
    gap: space.md,
    minHeight: NUMBER + space.lg,
  },
  rail: {
    width: NUMBER,
    alignItems: "center",
  },
  number: {
    width: NUMBER,
    height: NUMBER,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 2,
    backgroundColor: color.background,
  },
  numberText: {
    fontSize: fontSize.detail,
    fontWeight: fontWeight.bold,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: color.border,
  },
  rowWords: {
    flex: 1,
    gap: space.xs / 2,
    paddingBottom: space.md,
  },
  rowName: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  rowTime: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  stop: {
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
