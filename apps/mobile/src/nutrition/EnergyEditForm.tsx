import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { readNumber } from "../body/bodyUnits";
import { gymStyles } from "../gym/gymStyles";
import { t } from "../i18n";
import { color, font, MIN_TAP_SIZE, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";

type Props = {
  title: string;
  /** What the number is of, for an activity: «Gym · 50:00 · 18:05». */
  about?: string;
  /** What the field counts: «kcal a day», «kcal». */
  unit: string;
  hint: string;
  /** MuW's estimate, always in sight. */
  estimate: number;
  /** The number the user wrote before; null while the estimate counts. */
  written: number | null;
  /** The whole kilocalories the field takes. */
  range: { min: number; max: number };
  /** The number to count from here on; null: the estimate again. */
  onWritten: (kcal: number | null) => void;
  onCancel: () => void;
};

/**
 * A number of the energy written by hand (TASK-489 part C1, ADR-0397, the
 * user's request of 2026-11-23): the kilocalories a day at rest, or the
 * ones of one activity. The field starts empty unless the user wrote a
 * number before; MuW's estimate stays in sight, and «Back to the estimate»
 * takes the user's number away.
 */
export function EnergyEditForm({
  title,
  about,
  unit,
  hint,
  estimate,
  written,
  range,
  onWritten,
  onCancel,
}: Props) {
  const [text, setText] = useState(written === null ? "" : String(written));
  const typed = readNumber(text);
  const kcal =
    typed !== null && Math.round(typed) >= range.min && Math.round(typed) <= range.max
      ? Math.round(typed)
      : null;
  return (
    <View style={styles.form} testID="energy-edit">
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {about !== undefined && <Text style={styles.muted}>{about}</Text>}
      <Text style={styles.label}>{unit}</Text>
      <TextInput
        style={gymStyles.input}
        value={text}
        onChangeText={setText}
        keyboardType="number-pad"
        maxLength={String(range.max).length}
        placeholder={String(estimate)}
        placeholderTextColor={color.textFaint}
        keyboardAppearance="dark"
        returnKeyType="done"
        autoFocus
        accessibilityLabel={unit}
        testID="energy-edit-input"
      />
      <Text style={styles.muted}>{hint}</Text>
      <Text style={styles.estimate} testID="energy-edit-estimate">
        {t("MuW's estimate: {kcal} kcal", { kcal: String(Math.round(estimate)) })}
      </Text>
      <View style={gymStyles.row}>
        <Tap style={gymStyles.button} onPress={onCancel} accessibilityRole="button">
          <Text style={gymStyles.buttonText}>{t("Cancel")}</Text>
        </Tap>
        <Tap
          style={[gymStyles.button, kcal === null && gymStyles.disabled]}
          onPress={() => kcal !== null && onWritten(kcal)}
          disabled={kcal === null}
          accessibilityRole="button"
          accessibilityState={{ disabled: kcal === null }}
          testID="energy-edit-save"
        >
          <Text style={gymStyles.buttonText}>{t("Save")}</Text>
        </Tap>
      </View>
      {written !== null && (
        <Tap
          style={styles.back}
          onPress={() => onWritten(null)}
          accessibilityRole="button"
          testID="energy-edit-estimate-back"
        >
          <Text style={styles.backText}>{t("Back to the estimate")}</Text>
        </Tap>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: space.sm,
  },
  title: {
    ...font.heading,
    color: color.text,
  },
  label: {
    ...font.small,
    color: color.textMuted,
    marginTop: space.xs,
  },
  muted: {
    ...font.small,
    color: color.textMuted,
  },
  estimate: {
    ...font.body,
    color: color.text,
    marginBottom: space.sm,
  },
  back: {
    alignSelf: "center",
    justifyContent: "center",
    minHeight: MIN_TAP_SIZE,
  },
  backText: {
    ...font.body,
    color: color.text,
    textDecorationLine: "underline",
  },
});
