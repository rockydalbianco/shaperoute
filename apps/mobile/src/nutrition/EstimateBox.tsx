import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useBody } from "../body/useBody";
import { gymStyles } from "../gym/gymStyles";
import { t } from "../i18n";
import { color, font, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { type Purpose, targetEstimate } from "./targetEstimate";

type Props = {
  /** Why the user is here; null when they did not say. */
  purpose: Purpose | null;
  /** What the body uses in a usual day; null when not known yet. */
  usedPerDay: number | null;
  /** The year now, for the age; a test gives its own. */
  year?: number;
  /** «Use this number». */
  onUse: (kcal: number) => void;
};

/**
 * MuW's estimate of a daily target, behind the user's own number
 * (TASK-489 part J; ADR-0397, precisazione 5). Closed until the user opens
 * it: the user's choice is that writing the number by hand comes first and
 * this is «only a demo». Open, it shows the number with what it is (a
 * rough estimate from a public formula, by people who are not health
 * professionals) and who it is not for, or says why there is none.
 *
 * Nothing is shown beside a dietitian's plan: that number is the
 * dietitian's.
 */
export function EstimateBox({ purpose, usedPerDay, year, onUse }: Props) {
  const body = useBody();
  const [open, setOpen] = useState(false);
  if (purpose === "plan") {
    return null;
  }
  if (!open) {
    return (
      <Tap
        style={styles.link}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        testID="estimate-open"
      >
        <Text style={styles.linkText}>{t("See MuW's estimate (demo)")}</Text>
      </Tap>
    );
  }
  const estimate = targetEstimate(
    purpose,
    usedPerDay,
    body,
    year ?? new Date().getFullYear(),
  );
  if (estimate.kind === "none") {
    return (
      <View style={styles.box} testID="estimate-none">
        <Text style={styles.text}>
          {estimate.why === "under18"
            ? t("MuW suggests no calorie number to people under 18.")
            : estimate.why === "data"
              ? t(
                  "To estimate, MuW needs your weight, height, year of birth and sex. They stay on your phone.",
                )
              : t(
                  "From your data MuW suggests no number for this. Talk to your doctor or a dietitian.",
                )}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.box} testID="estimate-number">
      <Text style={styles.number} accessibilityRole="header">
        {t("MuW's estimate: {kcal} kcal a day", { kcal: String(estimate.kcal) })}
      </Text>
      <Text style={styles.note}>
        {t(
          "A rough estimate from a public formula, only a demonstration. MuW is not made by health professionals: this is not medical advice.",
        )}
      </Text>
      <Text style={styles.note}>
        {t(
          "If you are pregnant or breastfeeding, have an illness, or have or had an eating disorder, this number is not for you: ask your doctor.",
        )}
      </Text>
      <View style={gymStyles.row}>
        <Tap
          style={gymStyles.button}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          testID="estimate-own"
        >
          <Text style={gymStyles.buttonText}>{t("I'll write my own")}</Text>
        </Tap>
        <Tap
          style={gymStyles.button}
          onPress={() => {
            onUse(estimate.kcal);
            setOpen(false);
          }}
          accessibilityRole="button"
          testID="estimate-use"
        >
          <Text style={gymStyles.buttonText}>{t("Use this number")}</Text>
        </Tap>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  link: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  linkText: {
    ...font.small,
    color: color.text,
    textDecorationLine: "underline",
  },
  box: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surfaceRaised,
  },
  number: {
    ...font.cardTitle,
    color: color.text,
  },
  text: {
    ...font.body,
    color: color.text,
  },
  note: {
    ...font.small,
    color: color.textMuted,
  },
});
