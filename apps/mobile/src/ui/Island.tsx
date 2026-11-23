import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  useWindowDimensions,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  color,
  fontSize,
  fontWeight,
  glass,
  type GlassColors,
  glassOf,
  radius,
  space,
  tone,
} from "../theme/tokens";
import { fadeTo, springTo } from "./motion";
import { type GlassMode, useGlassMode } from "./useGlassMode";
import { useReduceMotion } from "./useReduceMotion";

/** How long the island stays open with its words, in milliseconds. */
export const ISLAND_HOLD_MS = 1800;
/** Between one step and the next: wider, then taller, then the words. */
export const ISLAND_STEP_MS = 120;
/** Its height, open, in points. */
export const ISLAND_HEIGHT = 40;
/** How small it is born and goes back: a share of its width and height. */
export const ISLAND_BORN = { wide: 0.3, tall: 0.75 } as const;

/** The glass of the dark tone: the island is dark in every tone. */
const DARK_GLASS: GlassColors = glassOf({ ...tone, tone: "dark" });

/**
 * The island in `mode` (TASK-469 A7b, ADR-0383, «Capsula»): dark glass —
 * the thin rim of the dark tone's glass with the light caught by its top
 * edge, and a short shadow under it. The face stays `scrim`, so its words
 * keep their contrast over any page. With «Reduce Transparency» or
 * «Increase Contrast» nothing is added: the dark capsule, as before.
 */
export function islandFace(
  mode: GlassMode,
  dark: GlassColors = DARK_GLASS,
  shadow: string = glass.shadow,
): ViewStyle {
  if (mode !== "glass") {
    return {};
  }
  return {
    boxShadow: [
      { offsetX: 0, offsetY: 4, blurRadius: 12, color: shadow },
      {
        inset: true,
        offsetX: 0,
        offsetY: 0,
        blurRadius: 0,
        spreadDistance: 1,
        color: dark.rim,
      },
      { inset: true, offsetX: 0, offsetY: 1, blurRadius: 0, color: dark.rimTop },
    ],
  };
}

export type IslandSay = {
  /** A new number for each thing said: the same words twice play twice. */
  id: number;
  text: string;
};

type Props = {
  say: IslandSay;
  /** Closed and gone: nothing left on screen. */
  onDone: () => void;
};

/**
 * The island (TASK-388, ADR-0329): a dark capsule at the top, in the middle,
 * for a short word after a gesture, as the Dynamic Island of iOS. Born
 * small, it grows wider and then taller on the spring `island`, its words
 * fade in once it is open, it stays a moment, then the words go and it
 * closes the way it came. Something new said while it is open changes the
 * words and starts the moment again: it never closes and opens between.
 * With «Reduce Motion» it only fades in and out, at its size.
 *
 * Over everything below it, and the touches go through.
 */
export function Island({ say, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const still = useReduceMotion();
  const face = islandFace(useGlassMode());
  const [wide] = useState(() => new Animated.Value(0));
  const [tall] = useState(() => new Animated.Value(0));
  const [words] = useState(() => new Animated.Value(0));
  // The newest `onDone`, without playing it again.
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  // Before the new words are seen: they come in on their own fade.
  useLayoutEffect(() => {
    words.setValue(0);
    const to = (value: Animated.Value, end: number) =>
      still ? fadeTo(value, end) : springTo(value, end, "island");
    const after = (steps: number, animation: Animated.CompositeAnimation) =>
      Animated.sequence([Animated.delay(steps * ISLAND_STEP_MS), animation]);
    // Each spring goes from where the value is: open already, it stays open.
    const play = Animated.sequence([
      Animated.parallel([
        to(wide, 1),
        after(1, to(tall, 1)),
        after(2, fadeTo(words, 1)),
      ]),
      Animated.delay(ISLAND_HOLD_MS),
      Animated.parallel([
        fadeTo(words, 0),
        after(1, to(tall, 0)),
        after(2, to(wide, 0)),
      ]),
    ]);
    play.start(({ finished }) => {
      if (finished) {
        done.current();
      }
    });
    return () => play.stop();
  }, [say.id, still, wide, tall, words]);

  const scaleX = still
    ? 1
    : wide.interpolate({ inputRange: [0, 1], outputRange: [ISLAND_BORN.wide, 1] });
  const scaleY = still
    ? 1
    : tall.interpolate({ inputRange: [0, 1], outputRange: [ISLAND_BORN.tall, 1] });
  // Seen as it starts to grow, gone as it is back to its smallest.
  const seen = wide.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 1, 1],
    extrapolate: "clamp",
  });
  const lit = words.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      testID="island"
      pointerEvents="none"
      style={[
        styles.island,
        face,
        {
          top: insets.top + space.xs,
          maxWidth: width - 2 * space.xl,
          opacity: seen,
          transform: [{ scaleX }, { scaleY }],
        },
      ]}
    >
      <Animated.Text
        testID="island-words"
        style={[styles.words, { opacity: lit }]}
        numberOfLines={1}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        {say.text}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Dark in the light theme and in the dark one, as the island of iOS.
  island: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 10,
    height: ISLAND_HEIGHT,
    minWidth: ISLAND_HEIGHT * 3,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.scrim,
  },
  words: {
    color: color.onScrim,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
