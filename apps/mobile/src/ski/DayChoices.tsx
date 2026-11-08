import type { SnowType } from "@shaperoute/shared-types";
import { SKI_GEAR_MAX, SNOW_TYPES } from "@shaperoute/shared-types";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { t, tLater } from "../i18n";
import { color, font, fontWeight, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { loadGear, loadSnow, saveGear, saveSnow } from "./skiDayStore";

/** The five snows, in the order of the choice (the user's, 2026-11-07). */
export const SNOW_LABELS: Readonly<Record<SnowType, string>> = {
  powder: tLater("Powder"),
  groomed: tLater("Groomed"),
  icy: tLater("Icy"),
  spring: tLater("Spring"),
  heavy: tLater("Heavy"),
};

/**
 * At the end of a day on the snow (TASK-406 part D2, ADR-0338): «How was the
 * snow?», one of five or none, and «Your gear», free text remembered for
 * the next day (the user's choices, questions 2 and 3). Kept on the phone as
 * they change; «Save» sends them with the day.
 */
export function DayChoices() {
  const [snow, setSnow] = useState<SnowType | null>(loadSnow);
  const [gear, setGear] = useState(loadGear);
  return (
    <View style={styles.choices} testID="day-choices">
      <Text style={styles.label} accessibilityRole="header">
        {t("How was the snow?")}
      </Text>
      <View style={styles.chips}>
        {SNOW_TYPES.map((type) => {
          const chosen = snow === type;
          return (
            <Pressable
              key={type}
              style={[styles.chip, chosen && styles.chosen]}
              onPress={() => {
                const next = chosen ? null : type;
                setSnow(next);
                saveSnow(next);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: chosen }}
              testID={`snow-${type}`}
            >
              <Text style={[styles.chipText, chosen && styles.chosenText]}>
                {t(SNOW_LABELS[type])}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.label}>{t("Your gear")}</Text>
      <TextInput
        style={styles.input}
        value={gear}
        onChangeText={(text) => {
          setGear(text);
          saveGear(text);
        }}
        placeholder={t("Ski or snowboard, brand and model")}
        placeholderTextColor={color.textMuted}
        accessibilityLabel={t("Your gear")}
        maxLength={SKI_GEAR_MAX}
        returnKeyType="done"
        testID="day-gear"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  choices: {
    gap: space.sm,
  },
  label: {
    ...font.small,
    fontWeight: fontWeight.semibold,
    color: color.textMuted,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  chip: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  chosen: {
    borderColor: color.text,
    backgroundColor: color.text,
  },
  chipText: {
    ...font.body,
    color: color.text,
  },
  chosenText: {
    color: color.surface,
    fontWeight: fontWeight.semibold,
  },
  input: {
    ...font.body,
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    color: color.text,
  },
});
