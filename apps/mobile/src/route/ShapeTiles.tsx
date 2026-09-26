import { type Shape, SHAPES } from "@shaperoute/shared-types";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { shapeName } from "./shapeWords";

/**
 * A sign for each shape of the catalogue. Text, not drawings: drawing the real
 * outlines needs react-native-svg, a dependency not yet asked for (TASK-051).
 */
export const SHAPE_SIGNS: Record<Shape, string> = {
  circle: "◯",
  heart: "♥",
  star: "★",
  horse: "🐎",
  moon: "☾",
  cat: "🐈",
  fish: "🐟",
  butterfly: "🦋",
  snail: "🐌",
  dog_head: "🐶",
};

type Props = {
  /** The shape the field names now, shown as chosen; null for none. */
  chosen: Shape | null;
  /** Gets the shape's name as the runner reads it: "dog head". */
  onPick: (name: string) => void;
};

/** The shapes of the catalogue as tiles: touching one writes it in the field. */
export function ShapeTiles({ chosen, onPick }: Props) {
  return (
    <View style={styles.grid}>
      {SHAPES.map((shape) => {
        const selected = shape === chosen;
        return (
          <Pressable
            key={shape}
            style={[styles.tile, selected && styles.selected]}
            onPress={() => onPick(shapeName(shape))}
            accessibilityRole="button"
            accessibilityLabel={shapeName(shape)}
            accessibilityState={{ selected }}
          >
            <Text style={styles.sign}>{SHAPE_SIGNS[shape]}</Text>
            <Text style={[styles.name, selected && styles.selectedName]}>
              {shapeName(shape)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  tile: {
    // Four to a row on a phone, whatever its width.
    flexBasis: "22%",
    flexGrow: 1,
    minHeight: MIN_TAP_SIZE * 2,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  // Chosen is told by the border, not by yellow: that is the route's.
  selected: {
    borderColor: color.text,
    backgroundColor: color.surfaceRaised,
  },
  sign: {
    color: color.text,
    fontSize: fontSize.title,
  },
  name: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  selectedName: {
    color: color.text,
    fontWeight: fontWeight.semibold,
  },
});
