import { Pressable, StyleSheet, Text } from "react-native";

import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { tourTexts } from "./tourTexts";

type Props = {
  /** Opens «How MuW works». */
  onOpen: () => void;
};

/**
 * «Guide» on the first page of «Profile» (TASK-266): the way to «How MuW
 * works» and to the tour again, with an account or without. A row as the
 * rows of «ABOUT» in «Settings» (`../about/AboutRows`).
 */
export function GuideRow({ onOpen }: Props) {
  const name = tourTexts().guide;
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onOpen}
      accessibilityRole="button"
      // One name for the row: the emoji and the arrow are not read.
      accessibilityLabel={name}
    >
      <Text style={styles.emoji}>❓</Text>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

/**
 * «Watch the tour», over «How MuW works»: closes «Profile» and starts the
 * tour on «Draw».
 */
export function WatchTourButton({ onWatch }: { onWatch: () => void }) {
  const name = tourTexts().watch;
  return (
    <Pressable
      style={({ pressed }) => [styles.watch, pressed && styles.pressed]}
      onPress={onWatch}
      accessibilityRole="button"
      accessibilityLabel={name}
    >
      <Text style={styles.watchText}>▶︎ {name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TAP_SIZE + space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  pressed: {
    opacity: 0.6,
  },
  emoji: {
    fontSize: fontSize.input + space.xs,
  },
  name: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.medium,
  },
  arrow: {
    color: color.textMuted,
    fontSize: fontSize.title,
  },
  // As the way back over it: a control, not yellow.
  watch: {
    minHeight: MIN_TAP_SIZE,
    alignSelf: "flex-start",
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  watchText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
