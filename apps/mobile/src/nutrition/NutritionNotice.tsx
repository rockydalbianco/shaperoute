import { StyleSheet, Text, View } from "react-native";

import { gymStyles } from "../gym/gymStyles";
import { t } from "../i18n";
import { color, font, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";

type Props = {
  /** «I understand»: the page opens, and the notice is not shown again. */
  onUnderstood: () => void;
};

/**
 * «Before you start» (TASK-489 part B, ADR-0397): what «Nutrition» is not,
 * said before anything can be written. The words are the ones the user
 * approved on 2026-11-22: MuW gives no diets and no medical advice, every
 * number is an estimate, and who should talk to a doctor first.
 */
export function NutritionNotice({ onUnderstood }: Props) {
  return (
    <View style={styles.notice} testID="nutrition-notice">
      <Text style={styles.title} accessibilityRole="header">
        {t("Before you start")}
      </Text>
      <Text style={styles.text}>
        {t(
          "MuW does not provide diets, meal plans or medical advice. The plan here is the one you write: your own, or the one your dietitian gave you.",
        )}
      </Text>
      <Text style={styles.text}>
        {t(
          "Every number is an estimate, from food composition tables and from formulas for the energy you use.",
        )}
      </Text>
      <Text style={styles.text}>
        {t(
          "If you have a medical condition, are pregnant or have a history of eating disorders, talk to a doctor or a dietitian before counting calories.",
        )}
      </Text>
      <Tap
        style={[gymStyles.button, styles.button]}
        onPress={onUnderstood}
        accessibilityRole="button"
        testID="nutrition-understood"
      >
        <Text style={gymStyles.buttonText}>{t("I understand")}</Text>
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    gap: space.md,
  },
  title: {
    ...font.heading,
    color: color.text,
  },
  text: {
    ...font.body,
    color: color.text,
  },
  button: {
    flex: 0,
    marginTop: space.sm,
  },
});
