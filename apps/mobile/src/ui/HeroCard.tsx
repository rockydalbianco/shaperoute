import { type ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

import { color, radius, space } from "../theme/tokens";
import { tintOver } from "./tint";

/** How much of the section's colour the halo adds over the veil. */
export const HERO_HALO_SHARE = 0.24;
/** The halo's width, as a share of the card's. */
const HALO_SIZE = "70%";

type Props = {
  /** The section's colour: the card's veil and the halo in its corner. */
  colour: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children?: ReactNode;
};

/**
 * The large card at the top of a page (TASK-523, ADR-0417): the veil of the
 * section's colour, and a halo of the same colour, stronger, round and half
 * out of its top corner. The halo is a picture: flat colours, no gradient
 * (the app has no drawing library). The text keeps 4.5:1 on it and the
 * section's colour 3:1, so a title or a ring may cross it; the secondary
 * text is written on the veil, not on the halo (`HeroCard.test.tsx`).
 * Opaque, as every card.
 */
export function HeroCard({ colour, style, testID, children }: Props) {
  return (
    <View
      style={[styles.card, { backgroundColor: tintOver(colour, color.surface) }, style]}
      testID={testID}
    >
      <View
        style={[
          styles.halo,
          { backgroundColor: tintOver(colour, color.surface, HERO_HALO_SHARE) },
        ]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        pointerEvents="none"
        testID={testID === undefined ? undefined : `${testID}-halo`}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.md,
    padding: space.xl,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  halo: {
    position: "absolute",
    top: "-35%",
    right: "-20%",
    width: HALO_SIZE,
    aspectRatio: 1,
    borderRadius: radius.pill,
  },
});
