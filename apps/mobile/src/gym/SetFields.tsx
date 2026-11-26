import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { readNumber } from "../body/bodyUnits";
import { t } from "../i18n";
import { clockLabel } from "../navigation/freeRun";
import { color, font, fontWeight, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import type { Units } from "../units/units";
import { gymStyles } from "./gymStyles";
import {
  type Entry,
  fieldsOf,
  fieldText,
  fieldUnit,
  readDuration,
  readField,
  type SetField,
  type SetValues,
} from "./setKinds";

/** What is typed in each field, as it is typed. */
export type SetTexts = Partial<Record<SetField, string>>;

/** The name of `field` over its box (the user's texts, 2026-11-04). */
export function fieldName(field: SetField, entry: Entry): string {
  switch (field) {
    case "reps":
      return t("Reps");
    case "load_kg":
      return entry.kind === "bodyweight" ? t("Added weight") : t("Weight");
    case "duration_s":
      return t("Time");
    case "distance_m":
      return t("Distance");
    case "speed_kmh":
      return t("Speed");
    case "incline_pct":
      return t("Incline");
    case "level":
      return t("Level");
    case "floors":
      return t("Floors");
  }
}

/** The texts of `values`, to type them again. */
export function textsOf(entry: Entry, values: SetValues, units: Units): SetTexts {
  const texts: SetTexts = {};
  for (const field of fieldsOf(entry)) {
    const value = values[field];
    if (value !== undefined) {
      texts[field] = fieldText(field, value, units);
    }
  }
  return texts;
}

/** The values of what was typed; a field that is no number is left out,
 * and setOf says whether the set is whole. */
export function valuesOfTexts(entry: Entry, texts: SetTexts, units: Units): SetValues {
  const values: SetValues = {};
  for (const field of fieldsOf(entry)) {
    const text = texts[field];
    if (text === undefined || text.trim() === "") {
      continue;
    }
    const value = readField(field, text, entry.kind, units);
    if (value !== null) {
      values[field] = value;
    }
  }
  return values;
}

/**
 * How far − and + move `field` (TASK-511, the user's «− e + accanto»), in
 * what the box shows: a rep, 2.5 kg or 5 lb, 5 seconds of a timed set or a
 * minute of cardio, a floor, a level. Null for a field typed only: a
 * distance, a speed, an incline.
 */
export function stepOf(field: SetField, entry: Entry, units: Units): number | null {
  switch (field) {
    case "reps":
    case "floors":
    case "level":
      return 1;
    case "load_kg":
      return units === "mi" ? 5 : 2.5;
    case "duration_s":
      return entry.kind === "cardio" ? 60 : 5;
    default:
      return null;
  }
}

/** The text of `field` after a − (`sign` -1) or a + (1): never under 0;
 * a − on an empty box leaves it empty, a + starts it at one step. */
export function steppedText(
  field: SetField,
  entry: Entry,
  text: string,
  sign: 1 | -1,
  units: Units,
): string {
  const step = stepOf(field, entry, units);
  if (step === null || (text.trim() === "" && sign < 0)) {
    return text;
  }
  if (field === "duration_s") {
    const now = text.trim() === "" ? 0 : readDuration(text, entry.kind);
    return now === null ? text : clockLabel(Math.max(0, now + sign * step) * 1000);
  }
  const now = text.trim() === "" ? 0 : readNumber(text);
  if (now === null) {
    return text;
  }
  return String(Math.max(0, Math.round((now + sign * step) * 10) / 10));
}

/** What a field shows before anything is typed: how a time is written. */
function hintOf(field: SetField): string | undefined {
  return field === "duration_s" ? "0:00" : undefined;
}

/**
 * The boxes of a set of `entry` (TASK-385 part B): reps and kg, or the
 * time, or what the machine shows, each named over its box with its unit
 * after the number (kg or lb, km or mi, as «Settings» says).
 */
export function SetFields({
  entry,
  texts,
  units,
  onChange,
}: {
  entry: Entry;
  texts: SetTexts;
  units: Units;
  onChange: (texts: SetTexts) => void;
}) {
  return (
    <View style={styles.fields}>
      {fieldsOf(entry).map((field) => {
        const name = fieldName(field, entry);
        const unit = fieldUnit(field, units);
        const stepped = stepOf(field, entry, units) !== null;
        const text = texts[field] ?? "";
        const step = (sign: 1 | -1) =>
          onChange({ ...texts, [field]: steppedText(field, entry, text, sign, units) });
        return (
          <View key={field} style={styles.field}>
            <Text style={styles.name}>{name}</Text>
            <View style={styles.box}>
              {stepped && (
                <StepButton
                  label="−"
                  hint={t("Less {field}", { field: name })}
                  onPress={() => step(-1)}
                  testID={`set-${field}-less`}
                />
              )}
              <TextInput
                style={[gymStyles.input, styles.input, stepped && styles.stepped]}
                value={text}
                onChangeText={(text) => onChange({ ...texts, [field]: text })}
                placeholder={hintOf(field)}
                placeholderTextColor={color.textFaint}
                keyboardType={
                  field === "duration_s" || field === "incline_pct"
                    ? "numbers-and-punctuation"
                    : "decimal-pad"
                }
                accessibilityLabel={name}
                testID={`set-${field}`}
              />
              {unit !== null && <Text style={styles.unit}>{unit}</Text>}
              {stepped && (
                <StepButton
                  label="+"
                  hint={t("More {field}", { field: name })}
                  onPress={() => step(1)}
                  testID={`set-${field}-more`}
                />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** A − or a + beside a box: as big as a thumb, neutral like the box. */
function StepButton({
  label,
  hint,
  onPress,
  testID,
}: {
  label: string;
  hint: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.step, pressed && styles.stepPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint}
      hitSlop={space.xs}
      testID={testID}
    >
      <Text style={styles.stepText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fields: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
  },
  field: {
    flexGrow: 1,
    flexBasis: 150,
    gap: space.xs,
  },
  name: {
    ...font.small,
    color: color.textMuted,
  },
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  input: {
    flex: 1,
  },
  // With − and + on its sides the number sits in the middle, short.
  stepped: {
    minWidth: 0,
    paddingHorizontal: space.xs,
    textAlign: "center",
  },
  step: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  stepPressed: {
    backgroundColor: color.surface,
  },
  stepText: {
    ...font.body,
    color: color.text,
    fontWeight: fontWeight.bold,
  },
  unit: {
    ...font.body,
    color: color.text,
  },
});
