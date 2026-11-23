import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { readNumber } from "../body/bodyUnits";
import { gymStyles } from "../gym/gymStyles";
import { t } from "../i18n";
import { color, font, MIN_TAP_SIZE, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { type Food, FOOD_NAME_MAX, foodName, KCAL_PER_100G } from "./foods";
import { addFood, changeFood, removeFood } from "./useNutrition";

type Props = {
  /** A food of the user's to rewrite; none for a new one. */
  food?: Food | null;
  /** The name to start from: what was typed in the search. */
  startName?: string;
  /** Kept on the phone: the food as it is now. */
  onSaved: (food: Food) => void;
  /** «Delete food»: the food is out of the user's list. */
  onDeleted: () => void;
  onCancel: () => void;
};

/**
 * «My own food» (TASK-489 part B, ADR-0397): a name and the calories of
 * 100 g, as the user reads them on a label or on their dietitian's sheet.
 * MuW suggests no number. Calories first (the user's choice): protein,
 * carbohydrate and fat are not asked yet, and a food rewritten keeps the
 * ones it had.
 */
export function OwnFoodForm({ food, startName, onSaved, onDeleted, onCancel }: Props) {
  const [name, setName] = useState(food?.name ?? startName ?? "");
  const [kcal, setKcal] = useState(food ? String(food.kcalPer100g) : "");
  const number = readNumber(kcal);
  const ready =
    foodName(name) !== null &&
    number !== null &&
    number >= KCAL_PER_100G.min &&
    number <= KCAL_PER_100G.max;

  function save() {
    if (!ready || number === null) {
      return;
    }
    const fields = {
      name,
      kcalPer100g: number,
      proteinPer100g: food?.proteinPer100g ?? null,
      carbsPer100g: food?.carbsPer100g ?? null,
      fatPer100g: food?.fatPer100g ?? null,
    };
    const saved = food ? changeFood(food.key, fields) : addFood(fields);
    if (saved !== null) {
      onSaved(saved);
    }
  }

  return (
    <View style={styles.form} testID="own-food-form">
      <Text style={styles.title} accessibilityRole="header">
        {t("My own food")}
      </Text>
      <Text style={styles.label}>{t("Name")}</Text>
      <TextInput
        style={gymStyles.input}
        value={name}
        onChangeText={setName}
        maxLength={FOOD_NAME_MAX}
        placeholderTextColor={color.textFaint}
        keyboardAppearance="dark"
        returnKeyType="next"
        accessibilityLabel={t("Name")}
        testID="own-food-name"
      />
      <Text style={styles.label}>{t("Calories in 100 g (kcal)")}</Text>
      <TextInput
        style={gymStyles.input}
        value={kcal}
        onChangeText={setKcal}
        keyboardType="decimal-pad"
        placeholderTextColor={color.textFaint}
        keyboardAppearance="dark"
        returnKeyType="done"
        accessibilityLabel={t("Calories in 100 g (kcal)")}
        testID="own-food-kcal"
      />
      <Text style={styles.hint}>
        {t("Copy the number from the label, or from your dietitian's sheet.")}
      </Text>
      <View style={gymStyles.row}>
        <Tap style={gymStyles.button} onPress={onCancel} accessibilityRole="button">
          <Text style={gymStyles.buttonText}>{t("Cancel")}</Text>
        </Tap>
        <Tap
          style={[gymStyles.button, !ready && gymStyles.disabled]}
          onPress={save}
          disabled={!ready}
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
          testID="own-food-save"
        >
          <Text style={gymStyles.buttonText}>{t("Save")}</Text>
        </Tap>
      </View>
      {food && (
        <Tap
          style={styles.remove}
          onPress={() => {
            removeFood(food.key);
            onDeleted();
          }}
          accessibilityRole="button"
          testID="own-food-delete"
        >
          <Text style={styles.removeText}>{t("Delete food")}</Text>
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
  hint: {
    ...font.small,
    color: color.textMuted,
    marginBottom: space.sm,
  },
  remove: {
    alignSelf: "center",
    justifyContent: "center",
    minHeight: MIN_TAP_SIZE,
  },
  removeText: {
    ...font.body,
    color: color.text,
    textDecorationLine: "underline",
  },
});
