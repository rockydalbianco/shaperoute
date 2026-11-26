import { StyleSheet, Text, View } from "react-native";

import { t, tLater } from "../i18n";
import type { Language } from "../i18n/languages";
import {
  color,
  font,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Cascade } from "../ui/Cascade";
import { Hairline } from "../ui/Hairline";
import { Tap } from "../ui/Tap";
import { foodNameIn } from "./foodNames";
import { kcalOf } from "./foods";
import { portionsKcal } from "./intake";
import type { Meal, Portion } from "./plan";

// In English; shown with t() in the app's language.
const TITLES: { readonly [M in Meal]: string } = {
  breakfast: tLater("Breakfast"),
  lunch: tLater("Lunch"),
  dinner: tLater("Dinner"),
  snacks: tLater("Snacks"),
};

/** The little figure beside a meal's name (part H): a picture only. */
const FIGURES: { readonly [M in Meal]: string } = {
  breakfast: "☕",
  lunch: "🍽️",
  dinner: "🌙",
  snacks: "🍎",
};

/** «Lunch», in the app's language. */
export function mealTitle(meal: Meal): string {
  return t(TITLES[meal]);
}

/** «284 kcal»: whole kilocalories, written the same in every language. A
 * portion and a meal are each rounded for themselves; the day is counted
 * from its portions and rounded once (intake.ts). */
export function kcalLabel(kcal: number): string {
  return `${Math.round(kcal)} kcal`;
}

type Props = {
  meal: Meal;
  portions: readonly Portion[];
  language: Language;
  /** «Add food». */
  onAdd: () => void;
  /** A portion touched: its grams can be changed, or it can be removed. */
  onPortion: (index: number) => void;
};

/**
 * A meal of a day (TASK-489 part B, ADR-0397): its portions with their
 * grams and the calories estimated for each, the meal's total beside its
 * name, and «Add food». Calories are written as the rest of the text, not
 * in a colour of their own: no number here is good or bad.
 */
export function MealCard({ meal, portions, language, onAdd, onPortion }: Props) {
  const title = mealTitle(meal);
  return (
    <View style={styles.card} testID={`meal-${meal}`}>
      <View style={styles.head}>
        <View style={styles.named}>
          <Text
            style={styles.figure}
            importantForAccessibility="no"
            accessibilityElementsHidden
          >
            {FIGURES[meal]}
          </Text>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
        </View>
        <Text style={styles.total} testID={`meal-${meal}-kcal`}>
          {portions.length === 0 ? "—" : kcalLabel(portionsKcal(portions))}
        </Text>
      </View>
      {portions.map((portion, index) => {
        const name = foodNameIn(portion.food, language);
        const kcal = kcalLabel(kcalOf(portion.food, portion.grams));
        return (
          // Each food comes in after the one above it (part H).
          <Cascade key={`${portion.food.key}-${index}`} index={index}>
            <Tap
              style={styles.portion}
              onPress={() => onPortion(index)}
              accessibilityRole="button"
              accessibilityLabel={`${name}, ${portion.grams} g, ${kcal}`}
              testID={`meal-${meal}-portion-${index}`}
            >
              <Text style={styles.name} numberOfLines={2}>
                {name}
                <Text style={styles.grams}>{` · ${portion.grams} g`}</Text>
              </Text>
              <Text style={styles.kcal}>{kcal}</Text>
            </Tap>
          </Cascade>
        );
      })}
      <Hairline />
      <Tap
        style={styles.add}
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel={`${t("Add food")}, ${title}`}
        testID={`meal-${meal}-add`}
      >
        <Text style={styles.addText}>{t("Add food")}</Text>
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  head: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: space.sm,
    paddingBottom: space.sm,
  },
  named: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    flexShrink: 1,
  },
  figure: {
    fontSize: fontSize.body,
  },
  title: {
    ...font.cardTitle,
    color: color.text,
  },
  total: {
    ...font.small,
    color: color.textMuted,
  },
  portion: {
    minHeight: MIN_TAP_SIZE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  name: {
    ...font.body,
    flexShrink: 1,
    color: color.text,
  },
  grams: {
    color: color.textMuted,
  },
  kcal: {
    ...font.body,
    color: color.text,
  },
  add: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  addText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    textDecorationLine: "underline",
  },
});
