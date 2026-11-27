import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { color, font, space } from "../theme/tokens";

type Props = {
  /** The group's name, written as it is shown («ACCOUNT»). */
  title: string;
  /** The section's colour, for a group that has one; the quiet grey if not. */
  colour?: string;
  /** Something small at the far end of the line: a count, a «See all». */
  trailing?: ReactNode;
  testID?: string;
};

/**
 * The name over a group of cards or rows (TASK-523, ADR-0417): the app's
 * label, a heading for screen readers. In the section's colour where the
 * group has one, which keeps 4.5:1 on the page and on a card
 * (`sectionContrast.test.ts`); never the only sign, the name is there.
 */
export function SectionHeader({ title, colour, trailing, testID }: Props) {
  return (
    <View style={styles.line} testID={testID}>
      <Text
        style={[styles.title, colour !== undefined && { color: colour }]}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    paddingHorizontal: space.xs,
  },
  title: {
    ...font.label,
    flexShrink: 1,
    color: color.textMuted,
  },
});
