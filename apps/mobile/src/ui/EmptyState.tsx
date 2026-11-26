import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { ShapeOutline } from "../game/ShapeOutline";
import { color, font, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { Tap } from "./Tap";
import { useReduceMotion } from "./useReduceMotion";

type Props = {
  /** The figure drawn faintly behind the words: an outline from 0 to 1, y
   * downwards, as the catalog's (`./outlines`). */
  outline: readonly (readonly [number, number])[];
  /** The page's name, when nothing above the figure says it already. */
  title?: string;
  message: string;
  /** The one quiet thing to do about it, when there is one. */
  action?: { label: string; onPress: () => void };
  testID?: string;
};

/** How long the pen takes to go round the figure, once. */
export const EMPTY_DRAW_MS = 1400;
const FIGURE_SIZE = 160;

/**
 * A page with nothing in it yet (TASK-339, ADR-0293): a figure of the
 * catalog in a faint line, a short title, a gentle line that says what will
 * fill the page, and at most one thing to do. No box, no exclamation mark.
 * The pen goes round the figure once in the route's yellow and leaves it
 * whole (TASK-509): a few strokes left standing read as a spinner that had
 * stopped. When the phone asks for less motion the figure is whole at once.
 */
export function EmptyState({ outline, title, message, action, testID }: Props) {
  const reduced = useReduceMotion();
  const [drawn] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) {
      drawn.setValue(1);
      return undefined;
    }
    const drawing = Animated.timing(drawn, {
      toValue: 1,
      duration: EMPTY_DRAW_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    drawing.start();
    return () => drawing.stop();
  }, [drawn, reduced]);
  return (
    <View style={styles.empty} testID={testID}>
      <View
        style={styles.figure}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <ShapeOutline
          outline={outline}
          size={FIGURE_SIZE}
          color={color.border}
          thickness={2}
        />
        <View style={StyleSheet.absoluteFill}>
          <ShapeOutline
            outline={outline}
            size={FIGURE_SIZE}
            color={color.accent}
            thickness={3}
            draw={drawn}
            testID="empty-state-pen"
          />
        </View>
      </View>
      <View style={styles.words}>
        {title !== undefined && (
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
        )}
        <Text style={styles.message}>{message}</Text>
      </View>
      {action && (
        <Tap style={styles.action} onPress={action.onPress} accessibilityRole="button">
          <Text style={styles.actionText}>{action.label}</Text>
        </Tap>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    gap: space.xl,
    paddingHorizontal: space.xxl,
    paddingVertical: space.xxl,
  },
  figure: {
    width: FIGURE_SIZE,
    height: FIGURE_SIZE,
  },
  words: {
    alignItems: "center",
    gap: space.sm,
  },
  title: {
    ...font.heading,
    color: color.text,
    textAlign: "center",
  },
  message: {
    ...font.body,
    color: color.textMuted,
    textAlign: "center",
  },
  action: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  actionText: {
    ...font.body,
    fontWeight: "500",
    color: color.text,
  },
});
