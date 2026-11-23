import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";

import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { NutritionPage } from "./NutritionPage";

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
      <Modal
        visible={open}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        {/* Its own edges, and mounted with the page: each opening starts
            on today. */}
        {open && (
          <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <SafeAreaView style={styles.page} edges={["top", "left", "right"]}>
              <View style={styles.bar}>
                <Pressable
                  style={styles.close}
                  onPress={() => setOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t("Close")}
                  testID="nutrition-close"
                >
                  <Text style={styles.closeMark}>✕</Text>
                </Pressable>
              </View>
              <NutritionPage />
            </SafeAreaView>
          </SafeAreaProvider>
        )}
      </Modal>
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
  page: {
    flex: 1,
    backgroundColor: color.background,
  },
  bar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: space.sm,
  },
  close: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  closeMark: {
    color: color.textMuted,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
});
