import { useLayoutEffect, useRef, useState } from "react";
import {
  Animated,
  type LayoutChangeEvent,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import { color, fontWeight, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { fadeTo, springTo } from "../ui/motion";
import { useReduceMotion } from "../ui/useReduceMotion";

type Props<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** The track: on the screen's background it wants a surface to show. */
  style?: StyleProp<ViewStyle>;
};

/** Where the choice `index` of `count` begins in a track `width` wide. */
export function segmentX(index: number, count: number, width: number): number {
  return space.xs + index * (segmentWidth(count, width) + space.xs);
}

/** How wide one choice is in a track `width` wide: they share it. */
export function segmentWidth(count: number, width: number): number {
  const n = Math.max(count, 1);
  return (width - 2 * space.xs - (n - 1) * space.xs) / n;
}

/**
 * One choice out of a few, side by side: the start (TASK-054), shape or word
 * (TASK-057). Touching the chosen one again still calls `onChange`: "My
 * position" asks the GPS again with it.
 *
 * The choice is a pill that slides to the new one on the spring `glide`
 * (TASK-469 A2, ADR-0383, the look «Capsula»): it never passes its mark,
 * and a touch while it travels sends it on from where it is. With «Reduce
 * Motion» it fades in where it goes. Until the track has been measured the
 * chosen one wears the pill itself, so there is never a frame without it.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: Props<T>) {
  const still = useReduceMotion();
  const [width, setWidth] = useState(0);
  const count = options.length;
  const index = Math.max(
    options.findIndex((option) => option.value === value),
    0,
  );
  const [x] = useState(() => new Animated.Value(0));
  const [shown] = useState(() => new Animated.Value(1));
  // Where the pill stands or goes, in points; null until it is placed.
  const placed = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (width <= 0) {
      return;
    }
    const to = segmentX(index, count, width);
    if (placed.current === null) {
      // The first place, or a track that changed width: no travel.
      x.setValue(to);
      placed.current = to;
      return;
    }
    if (placed.current === to) {
      return;
    }
    placed.current = to;
    if (still) {
      x.setValue(to);
      shown.setValue(0);
      fadeTo(shown, 1).start();
      return;
    }
    springTo(x, to, "glide").start();
  }, [index, count, width, still, x, shown]);

  function measured(event: LayoutChangeEvent) {
    const next = event.nativeEvent.layout.width;
    if (next !== width) {
      placed.current = null;
      setWidth(next);
    }
  }

  const sliding = width > 0;
  return (
    <View testID="segmented" style={[styles.modes, style]} onLayout={measured}>
      {sliding && (
        <Animated.View
          testID="segment-pill"
          pointerEvents="none"
          style={[
            styles.pill,
            styles.modeSelected,
            {
              width: segmentWidth(count, width),
              opacity: shown,
              transform: [{ translateX: x }],
            },
          ]}
        />
      )}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[styles.mode, selected && !sliding && styles.modeSelected]}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.modeText, selected && styles.modeTextSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  modes: {
    flexDirection: "row",
    padding: space.xs,
    gap: space.xs,
    borderRadius: radius.pill,
    backgroundColor: color.background,
  },
  mode: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  // The pill under the choice, as tall as the track's choices; it slides
  // under the words, which stay on top and readable while it travels.
  pill: {
    position: "absolute",
    top: space.xs,
    bottom: space.xs,
    left: 0,
    borderRadius: radius.pill,
  },
  // Chosen is told by a lighter surface, not by yellow: that is the route's.
  modeSelected: {
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  // On two lines when a label does not fit (TASK-340: «A mano libera»).
  // The choices not taken in the text's colour, lighter (TASK-361: in
  // `textMuted` they read as switched off); the one taken is told by its
  // surface, its border and a bolder weight.
  modeText: {
    textAlign: "center",
    color: color.text,
    fontWeight: fontWeight.medium,
  },
  modeTextSelected: {
    fontWeight: fontWeight.bold,
  },
});
