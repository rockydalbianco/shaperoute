import { type Shape, SHAPES } from "@shaperoute/shared-types";
import { useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

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
  rabbit_head: "🐰",
  pumpkin: "🎃",
  christmas_tree: "🎄",
  smiley: "🙂",
  ghost: "👻",
  donut: "🍩",
  sun: "☀️",
};

type Props = {
  /** The shape the field names now, shown as chosen; null for none. */
  chosen: Shape | null;
  /** Gets the shape's name as the runner reads it: "dog head". */
  onPick: (name: string) => void;
};

/**
 * The shapes of the catalogue as tiles in one row that slides sideways
 * (ADR-0084): touching one writes it in the field. A shape written in the
 * field brings its tile into view.
 */
export function ShapeTiles({ chosen, onPick }: Props) {
  const row = useRef<ScrollView>(null);
  const places = useRef(new Map<Shape, number>());

  useEffect(() => {
    const x = chosen === null ? undefined : places.current.get(chosen);
    if (x !== undefined) {
      row.current?.scrollTo({ x: Math.max(0, x - space.sm), animated: true });
    }
  }, [chosen]);

  return (
    <ScrollView
      ref={row}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      testID="shape-tiles"
    >
      {SHAPES.map((shape) => {
        const selected = shape === chosen;
        return (
          <Pressable
            key={shape}
            style={[styles.tile, selected && styles.selected]}
            onPress={() => onPick(shapeName(shape))}
            onLayout={(event) => places.current.set(shape, event.nativeEvent.layout.x)}
            accessibilityRole="button"
            accessibilityLabel={shapeName(shape)}
            accessibilityState={{ selected }}
          >
            <Text style={styles.sign}>{SHAPE_SIGNS[shape]}</Text>
            <Text
              style={[styles.name, selected && styles.selectedName]}
              numberOfLines={2}
            >
              {shapeName(shape)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: space.sm,
  },
  tile: {
    // A little under four to a phone's width: the cut tile says there is more.
    width: MIN_TAP_SIZE * 2,
    minHeight: MIN_TAP_SIZE * 2,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    paddingHorizontal: space.xs,
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
    textAlign: "center",
  },
  selectedName: {
    color: color.text,
    fontWeight: fontWeight.semibold,
  },
});
