import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { readNumber, weightKgOf, weightLabel, weightUnit } from "../body/bodyUnits";
import { useBody } from "../body/useBody";
import { useWeighIns, writeEvery, writeWeighIns } from "../body/useWeighIns";
import {
  goalAllowed,
  goalDoor,
  goalProgress,
  milestoneAllowed,
  reached,
  withGoal,
  withMilestone,
  withoutMilestone,
} from "../body/weightGoal";
import { EVERY_WEEKS, type EveryWeeks, latestOf, weightOf } from "../body/weighIns";
import { gymStyles } from "../gym/gymStyles";
import { t } from "../i18n";
import { color, font, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { useUnits } from "../units/useUnits";
import { Ring } from "./Ring";

/** The words of each choice of how often to ask. */
function everyLabel(every: EveryWeeks): string {
  switch (every) {
    case 1:
      return t("Every week");
    case 2:
      return t("Every 2 weeks");
    case 4:
      return t("Every 4 weeks");
    case 0:
      return t("Never");
  }
}

type Props = {
  /** The year now, for the age; a test gives its own. */
  year?: number;
};

/**
 * «My goal weight» (TASK-489 part K1, ADR-0397 precisazione 8), inside the
 * weight page: the goal and the milestones the user writes (MuW never
 * proposes one), only for adults who wrote height and year of birth, and
 * never under a body mass index of 18.5 (weightGoal.ts); then how often to
 * ask for a weigh-in.
 */
export function WeightGoalView({ year = new Date().getFullYear() }: Props) {
  const weighIns = useWeighIns();
  const body = useBody();
  const units = useUnits();
  const [goalText, setGoalText] = useState("");
  const [stepText, setStepText] = useState("");
  const door = goalDoor(body, year);
  const latest = latestOf(weighIns);
  const nowKg = latest?.kg ?? body.weightKg;
  const { goal } = weighIns;
  const label = (kg: number) => weightLabel(kg, units);

  const typedGoal = readNumber(goalText);
  const goalKg = typedGoal === null ? null : weightOf(weightKgOf(typedGoal, units));
  const goalOk = goalKg !== null && goalAllowed(door, goalKg);
  const typedStep = readNumber(stepText);
  const stepKg = typedStep === null ? null : weightOf(weightKgOf(typedStep, units));
  const stepOk = goal !== null && stepKg !== null && milestoneAllowed(goal, stepKg);
  const progress = goal !== null && nowKg !== null ? goalProgress(goal, nowKg) : null;
  const shownGoal = goal !== null && goalAllowed(door, goal.kg) ? goal : null;

  function saveGoal() {
    if (goalKg === null || !goalOk) {
      return;
    }
    writeWeighIns((now) => withGoal(now, goalKg, nowKg ?? goalKg));
    setGoalText("");
  }

  function saveStep() {
    if (stepKg === null || !stepOk) {
      return;
    }
    writeWeighIns((now) => withMilestone(now, stepKg));
    setStepText("");
  }

  return (
    <View style={styles.body} testID="weight-goal">
      <Text style={styles.title} accessibilityRole="header">
        {t("My goal weight")}
      </Text>

      {door.kind === "data" && (
        <Text style={styles.muted} testID="weight-goal-data">
          {t("To set a goal weight, add your height and year of birth in Settings.")}
        </Text>
      )}
      {door.kind === "under18" && (
        <Text style={styles.muted} testID="weight-goal-under18">
          {t("MuW has no weight goals for people under 18.")}
        </Text>
      )}

      {door.kind === "open" && shownGoal !== null && (
        <View style={styles.goal}>
          {progress !== null && (
            <Ring
              size={64}
              stroke={7}
              share={progress.totalKg === 0 ? 0 : progress.doneKg / progress.totalKg}
              colour={color.text}
              track={color.border}
            />
          )}
          <View style={styles.goalText}>
            <Text style={styles.big}>{label(shownGoal.kg)}</Text>
            {progress !== null && (
              <Text style={styles.muted} testID="weight-goal-progress">
                {t("{done} of {total} so far", {
                  done: label(progress.doneKg),
                  total: label(progress.totalKg),
                })}
              </Text>
            )}
          </View>
        </View>
      )}

      {door.kind === "open" && (
        <>
          {shownGoal === null && (
            <Text style={styles.text}>{t("Set my goal weight")}</Text>
          )}
          <View style={styles.field}>
            <TextInput
              style={[gymStyles.input, styles.input]}
              value={goalText}
              onChangeText={setGoalText}
              keyboardType="decimal-pad"
              maxLength={6}
              keyboardAppearance="dark"
              returnKeyType="done"
              onSubmitEditing={saveGoal}
              accessibilityLabel={t("My goal weight")}
              testID="weight-goal-input"
            />
            <Text style={styles.unit}>{weightUnit(units)}</Text>
            <Tap
              style={[gymStyles.button, styles.small, !goalOk && gymStyles.disabled]}
              onPress={saveGoal}
              disabled={!goalOk}
              accessibilityRole="button"
              accessibilityState={{ disabled: !goalOk }}
              testID="weight-goal-save"
            >
              <Text style={gymStyles.buttonText}>{t("Save")}</Text>
            </Tap>
          </View>
          <Text style={styles.muted}>
            {t("Lowest goal for your height: {weight}", { weight: label(door.minKg) })}
          </Text>
          {goalKg !== null && goalKg < door.minKg && (
            <Text style={styles.problem} testID="weight-goal-low">
              {t(
                "Below {weight} your weight would be low for your height (body mass index under 18.5). MuW doesn't set goals there.",
                { weight: label(door.minKg) },
              )}
            </Text>
          )}
        </>
      )}

      {door.kind === "open" && shownGoal !== null && (
        <>
          <Text style={styles.section} accessibilityRole="header">
            {t("My milestones")}
          </Text>
          {[...weighIns.milestones]
            .sort((a, b) => b - a)
            .map((kg) => {
              const done = nowKg !== null && reached(shownGoal, kg, nowKg);
              return (
                <Tap
                  key={kg}
                  style={styles.row}
                  onPress={() => writeWeighIns((now) => withoutMilestone(now, kg))}
                  accessibilityRole="button"
                  accessibilityHint={t("Remove")}
                  testID={`weight-milestone-${kg}`}
                >
                  <Text style={styles.text}>{label(kg)}</Text>
                  <Text style={styles.muted}>{done ? t("Reached") : t("Remove")}</Text>
                </Tap>
              );
            })}
          <View style={styles.field}>
            <TextInput
              style={[gymStyles.input, styles.input]}
              value={stepText}
              onChangeText={setStepText}
              keyboardType="decimal-pad"
              maxLength={6}
              keyboardAppearance="dark"
              returnKeyType="done"
              onSubmitEditing={saveStep}
              accessibilityLabel={t("Add a milestone")}
              testID="weight-milestone-input"
            />
            <Text style={styles.unit}>{weightUnit(units)}</Text>
            <Tap
              style={[gymStyles.button, styles.small, !stepOk && gymStyles.disabled]}
              onPress={saveStep}
              disabled={!stepOk}
              accessibilityRole="button"
              accessibilityState={{ disabled: !stepOk }}
              testID="weight-milestone-save"
            >
              <Text style={gymStyles.buttonText}>{t("Add a milestone")}</Text>
            </Tap>
          </View>
          {stepKg !== null && !stepOk && (
            <Text style={styles.problem} testID="weight-milestone-wrong">
              {t("A milestone goes between your starting weight and your goal.")}
            </Text>
          )}
          <Tap
            style={styles.link}
            onPress={() => writeWeighIns((now) => withGoal(now, null, nowKg ?? 0))}
            accessibilityRole="button"
            testID="weight-goal-remove"
          >
            <Text style={styles.linkText}>{t("Remove goal")}</Text>
          </Tap>
        </>
      )}

      <Text style={styles.section} accessibilityRole="header">
        {t("Ask me to weigh in")}
      </Text>
      <View style={styles.choices}>
        {EVERY_WEEKS.map((every) => {
          const on = weighIns.every === every;
          return (
            <Tap
              key={every}
              style={[gymStyles.chip, on && gymStyles.chipOn]}
              onPress={() => writeEvery(every)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              testID={`weight-every-${every}`}
            >
              <Text style={[gymStyles.chipText, on && gymStyles.chipTextOn]}>
                {everyLabel(every)}
              </Text>
            </Tap>
          );
        })}
      </View>
      <Text style={styles.muted}>
        {t(
          "The card shows in your diary on the day. You can always add a weigh-in yourself.",
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: space.sm,
  },
  title: {
    ...font.heading,
    color: color.text,
  },
  section: {
    ...font.cardTitle,
    color: color.text,
    marginTop: space.md,
  },
  goal: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  goalText: {
    flex: 1,
    gap: space.xs,
  },
  big: {
    ...font.heading,
    color: color.text,
  },
  text: {
    ...font.body,
    color: color.text,
  },
  muted: {
    ...font.small,
    color: color.textMuted,
  },
  problem: {
    ...font.small,
    color: color.error,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  input: {
    width: 110,
  },
  unit: {
    ...font.body,
    color: color.textMuted,
  },
  small: {
    flex: 1,
  },
  row: {
    minHeight: MIN_TAP_SIZE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  choices: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  link: {
    alignSelf: "flex-start",
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
  },
  linkText: {
    ...font.body,
    color: color.text,
    textDecorationLine: "underline",
  },
});
