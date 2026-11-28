import { type ReactNode } from "react";
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { color, font, radius, space } from "../theme/tokens";
import { inkOn, tintOver } from "./tint";

type Props = {
  /** The card's title, when it has one. */
  title?: string;
  /**
   * The section's colour: the card takes its veil and the title its colour.
   * With none it is a plain card.
   */
  colour?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children?: ReactNode;
};

/**
 * A card of a page (TASK-523, ADR-0417): soft corners, room inside, and a
 * title that is a heading. With a section's colour its face is that colour's
 * veil (`./tint`) and its title is in the colour where the tone's sections
 * read as words (`inkOn`: the dark tone), in the text's where they do not;
 * the words on it stay the text's, which reads on every veil
 * (`tint.test.ts`). Opaque: it goes under
 * the glass of the bars as any content does, and is never laid on a sheet's
 * glass.
 */
export function SectionCard({ title, colour, style, testID, children }: Props) {
  const tinted = colour !== undefined;
  return (
    <View
      style={[
        styles.card,
        tinted && { backgroundColor: tintOver(colour, color.surface) },
        style,
      ]}
      testID={testID}
    >
      {title !== undefined && (
        <Text
          style={[styles.title, tinted && { color: inkOn(colour, color.text) }]}
          accessibilityRole="header"
        >
          {title}
        </Text>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.card,
    backgroundColor: color.surface,
  },
  title: {
    ...font.cardTitle,
    color: color.text,
  },
});
