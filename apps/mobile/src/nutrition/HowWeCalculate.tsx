import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { color, font, MIN_TAP_SIZE, space } from "../theme/tokens";
import { NutritionSheet } from "./AddFoodSheet";

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * «How we calculate» (TASK-489 part B, ADR-0397): where every number of
 * «Nutrition» comes from, in words the user approved on 2026-11-23. The
 * foods' numbers are USDA's (FoodData Central, SR Legacy, April 2018: the
 * table of foodTable.ts) or the user's own; the energy used is an estimate
 * from published equations, or Apple Health's when it has the day. It says
 * again that MuW gives no diets, and that the page never leaves the phone.
 */
export function HowWeCalculate({ visible, onClose }: Props) {
  return (
    <NutritionSheet visible={visible} onClose={onClose} testID="how-we-calculate">
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          {t("How we calculate")}
        </Text>
        <Pressable
          style={styles.close}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("Close")}
          testID="how-we-calculate-close"
        >
          <Text style={styles.closeMark}>✕</Text>
        </Pressable>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading} accessibilityRole="header">
          {t("Food@@numbers")}
        </Text>
        <Text style={styles.text}>
          {t(
            "Calories of the foods in the list come from USDA FoodData Central (SR Legacy, April 2018), a public-domain food composition table. Your own foods use the numbers you wrote.",
          )}
        </Text>
        <Text style={styles.heading} accessibilityRole="header">
          {t("Energy you use")}
        </Text>
        <Text style={styles.text}>
          {t(
            "At rest: the Mifflin-St Jeor equation, from the body data in your profile. Activities: ACSM equations and the 2024 Compendium of Physical Activities. On days when Apple Health has your active energy, that number is used instead.",
          )}
        </Text>
        <Text style={styles.heading} accessibilityRole="header">
          {t("Estimates")}
        </Text>
        <Text style={styles.text}>
          {t(
            "Real values change with the product, the recipe and the person. MuW does not provide diets or medical advice.",
          )}
        </Text>
        <Text style={styles.small}>
          {t("Only you see this page. Nothing here leaves your phone.")}
        </Text>
      </ScrollView>
    </NutritionSheet>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
  },
  title: {
    ...font.heading,
    flexShrink: 1,
    color: color.text,
  },
  close: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  closeMark: {
    ...font.body,
    color: color.textMuted,
  },
  scroll: {
    flexShrink: 1,
  },
  heading: {
    ...font.cardTitle,
    color: color.text,
    marginTop: space.md,
  },
  text: {
    ...font.body,
    color: color.textMuted,
    marginTop: space.xs,
  },
  small: {
    ...font.small,
    color: color.textMuted,
    marginVertical: space.lg,
  },
});
