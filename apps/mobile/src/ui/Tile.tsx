import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { color, font, fontWeight, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { IconSquare } from "./IconSquare";
import { Tap } from "./Tap";
import { tintOver } from "./tint";

type Props = {
  label: string;
  /** A second, quieter line: what is chosen now, a count. */
  detail?: string;
  /** The section's colour. */
  colour: string;
  /** The icon, already in `colour`. */
  icon: ReactNode;
  /** One of a set of which this is the one chosen. */
  selected?: boolean;
  onPress: () => void;
  testID?: string;
};

/**
 * A small card to tap, for the grids of two columns (TASK-523, ADR-0417): an
 * icon on its square, a name, at most one quiet line. The one chosen takes
 * the section's veil, a border in its colour and a bolder name, and says so
 * to screen readers: never the colour alone. Its border has the same width
 * chosen or not, so nothing moves when the choice does.
 */
export function Tile({
  label,
  detail,
  colour,
  icon,
  selected,
  onPress,
  testID,
}: Props) {
  const chosen = selected === true;
  return (
    <Tap
      style={[
        styles.tile,
        chosen && {
          borderColor: colour,
          backgroundColor: tintOver(colour, color.surface),
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={detail === undefined ? label : `${label}, ${detail}`}
      accessibilityState={selected === undefined ? undefined : { selected: chosen }}
      testID={testID}
    >
      <IconSquare colour={colour}>{icon}</IconSquare>
      <View style={styles.words}>
        <Text style={[styles.label, chosen && styles.labelChosen]} numberOfLines={2}>
          {label}
        </Text>
        {detail !== undefined && (
          <Text style={styles.detail} numberOfLines={1}>
            {detail}
          </Text>
        )}
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 2 * MIN_TAP_SIZE,
    justifyContent: "space-between",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: color.surface,
    backgroundColor: color.surface,
  },
  words: {
    gap: space.xs / 2,
  },
  label: {
    ...font.body,
    color: color.text,
  },
  labelChosen: {
    fontWeight: fontWeight.semibold,
  },
  detail: {
    ...font.small,
    color: color.textMuted,
  },
});
