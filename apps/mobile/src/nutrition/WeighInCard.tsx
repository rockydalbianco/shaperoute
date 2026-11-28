import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { WEIGHT_KG } from "../body/bodyProfile";
import { readNumber, weightKgOf, weightLabel, weightUnit } from "../body/bodyUnits";
import { weighInNotNow, writeWeighIn, useWeighIns } from "../body/useWeighIns";
import { latestOf, weighInDue, weightOf } from "../body/weighIns";
import { gymStyles } from "../gym/gymStyles";
import { selectionFeel } from "../haptics/haptics";
import { t } from "../i18n";
import { color, font, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { useUnits } from "../units/useUnits";
import type { LocalDay } from "./localDay";
import { shortDay } from "./weightText";

type Props = {
  today: LocalDay;
  /** «Recalculate MuW's estimate», for who uses it for the daily target;
   * none for the others. */
  onRecalculate?: () => void;
};

/**
 * «Time to weigh in» (TASK-489 part K1, ADR-0397 precisazione 8): in the
 * diary on the day a weigh-in is due (weighIns.ts), with a field for the
 * weight in the app's units, «Save» and «Not now». The weight saved becomes
 * the weight in «Settings» too, and the card says so before it goes.
 */
export function WeighInCard({ today, onRecalculate }: Props) {
  const weighIns = useWeighIns();
  const units = useUnits();
  const [text, setText] = useState("");
  const [saved, setSaved] = useState<number | null>(null);

  if (saved !== null) {
    return (
      <View style={styles.card} testID="weigh-in-saved">
        <Text style={styles.text}>
          {t("Saved. Your weight in Settings is now {weight}.", {
            weight: weightLabel(saved, units),
          })}
        </Text>
        {onRecalculate !== undefined && (
          <Tap
            style={styles.link}
            onPress={onRecalculate}
            accessibilityRole="button"
            testID="weigh-in-recalculate"
          >
            <Text style={styles.linkText}>{t("Recalculate MuW's estimate")}</Text>
          </Tap>
        )}
        <Tap
          style={gymStyles.button}
          onPress={() => setSaved(null)}
          accessibilityRole="button"
          testID="weigh-in-done"
        >
          <Text style={gymStyles.buttonText}>{t("Done")}</Text>
        </Tap>
      </View>
    );
  }

  if (!weighInDue(weighIns, today)) {
    return null;
  }

  const last = latestOf(weighIns);
  const typed = readNumber(text);
  const kg = typed === null ? null : weightOf(weightKgOf(typed, units));
  const wrong = text.trim() !== "" && kg === null;

  function save() {
    if (kg === null) {
      return;
    }
    writeWeighIn(today, kg);
    selectionFeel();
    setText("");
    setSaved(kg);
  }

  return (
    <View style={styles.card} testID="weigh-in-card">
      <Text style={styles.title} accessibilityRole="header">
        {t("Time to weigh in")}
      </Text>
      <Text style={styles.muted}>
        {last === null
          ? t("Your first weigh-in starts the chart.")
          : t("Last time: {date}, {weight}", {
              date: shortDay(last.day, today),
              weight: weightLabel(last.kg, units),
            })}
      </Text>
      <View style={styles.field}>
        <TextInput
          style={[gymStyles.input, styles.input]}
          value={text}
          onChangeText={setText}
          keyboardType="decimal-pad"
          maxLength={6}
          placeholderTextColor={color.textFaint}
          keyboardAppearance="dark"
          returnKeyType="done"
          onSubmitEditing={save}
          accessibilityLabel={t("Your weight")}
          testID="weigh-in-input"
        />
        <Text style={styles.unit}>{weightUnit(units)}</Text>
      </View>
      {wrong && (
        <Text style={styles.problem} testID="weigh-in-wrong">
          {t("Write a weight between {min} and {max}.", {
            min: weightLabel(WEIGHT_KG.min, units),
            max: weightLabel(WEIGHT_KG.max, units),
          })}
        </Text>
      )}
      <View style={gymStyles.row}>
        <Tap
          style={gymStyles.button}
          onPress={() => weighInNotNow(today)}
          accessibilityRole="button"
          testID="weigh-in-not-now"
        >
          <Text style={gymStyles.buttonText}>{t("Not now")}</Text>
        </Tap>
        <Tap
          style={[gymStyles.button, kg === null && gymStyles.disabled]}
          onPress={save}
          disabled={kg === null}
          accessibilityRole="button"
          accessibilityState={{ disabled: kg === null }}
          testID="weigh-in-save"
        >
          <Text style={gymStyles.buttonText}>{t("Save")}</Text>
        </Tap>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  title: {
    ...font.cardTitle,
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
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  input: {
    width: 120,
  },
  unit: {
    ...font.body,
    color: color.textMuted,
  },
  problem: {
    ...font.small,
    color: color.error,
  },
  link: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
  },
  linkText: {
    ...font.body,
    color: color.text,
    textDecorationLine: "underline",
  },
});
