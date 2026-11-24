import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { color, fontSize, fontWeight, radius, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { NutritionWindow } from "./NutritionWindow";

type Props = {
  /** The width of a tile of the sport panel, in points. */
  size: number;
};

/**
 * «Nutrition» in the sport panel (TASK-489 part B, ADR-0397, the user's
 * choice: «a family of its own, at the bottom»): one tile under the title
 * «Food», after the sports. It is not a sport: touching it opens the page
 * above the panel and the sport chosen stays the one it was. Closed, the
 * panel is there again.
 *
 * `settings/SportButton.tsx` shows it only with `NUTRITION_ON`.
 */
export function NutritionFamily({ size }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.family} testID="sport-family-food">
      <Text style={styles.familyTitle} accessibilityRole="header">
        {t("Food@@nutrition")}
      </Text>
      <Tap
        style={[styles.tile, { width: size, minHeight: Math.round(size * 0.78) }]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t("Nutrition")}
        testID="nutrition-tile"
      >
        <Text style={styles.tileEmoji}>🥗</Text>
        <Text style={styles.tileName} numberOfLines={2}>
          {t("Nutrition")}
        </Text>
      </Tap>
      <NutritionWindow open={open} onClose={() => setOpen(false)} />
    </View>
  );
}

// The family and the tile look as the ones of settings/SportButton.tsx.
const styles = StyleSheet.create({
  family: {
    gap: space.sm,
  },
  familyTitle: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  tile: {
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    padding: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surfaceRaised,
  },
  tileEmoji: {
    fontSize: fontSize.title + space.sm,
  },
  tileName: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.medium,
    textAlign: "center",
  },
});
