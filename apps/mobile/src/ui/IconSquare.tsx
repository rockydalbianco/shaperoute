import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { color, radius } from "../theme/tokens";
import { tintOver } from "./tint";

/** The side of the square beside a row or on a card, in points. */
export const ICON_SQUARE = 36;

type Props = {
  /** The section's colour: the square is its veil, the icon is drawn in it. */
  colour: string;
  /** The side, in points: `ICON_SQUARE` unless told. */
  size?: number;
  /** The icon, already in `colour`. */
  children: ReactNode;
  testID?: string;
};

/**
 * The square behind an icon (TASK-523, ADR-0417): the veil of the section's
 * colour over a card, with soft corners. A picture only: the row or the card
 * it is on says what it is, so screen readers pass it by.
 */
export function IconSquare({ colour, size = ICON_SQUARE, children, testID }: Props) {
  return (
    <View
      style={[
        styles.square,
        { width: size, height: size, backgroundColor: tintOver(colour, color.surface) },
      ]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      testID={testID}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  square: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
});
