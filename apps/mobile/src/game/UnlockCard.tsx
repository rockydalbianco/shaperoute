import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { ShapeOutline } from "./ShapeOutline";

type Props = {
  /** «New shape unlocked», «Silver edition», «Collection complete». */
  title: string;
  /** The shape's or the collection's name, under the drawing. */
  name: string;
  /** What it means: «In your Animals collection.» */
  line: string;
  /** What is drawn, and in which colour. */
  outline: readonly (readonly [number, number])[];
  tint: string;
  /** What a screen reader says as it comes up. */
  announce: string;
  /** «See collection»: the app shows «Play». */
  onPlay: () => void;
  onClose: () => void;
};

/** How long the pen takes to draw the shape. */
export const DRAW_MS = 1200;
/** The drawing takes this much of the screen's width, never huge. */
const DRAW_SHARE = 0.55;
const DRAW_WIDEST = 260;

/**
 * «New shape unlocked» (TASK-296 part B, docs/GIOCO.md §9): over the app,
 * once the logo after «Save» has gone, the shape is drawn in the yellow,
 * stroke by stroke, with its name. A touch outside closes it. Since
 * TASK-423 part E the same card says an edition (in silver or gold), a
 * collection completed (in its frame's colour), or, past 3 at once, all of
 * them in one.
 */
export function UnlockCard({
  title,
  name,
  line,
  outline,
  tint,
  announce,
  onPlay,
  onClose,
}: Props) {
  const { width } = useWindowDimensions();
  const size = Math.min(width * DRAW_SHARE, DRAW_WIDEST);
  const [draw] = useState(() => new Animated.Value(0));
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(announce);
    const drawing = Animated.timing(draw, {
      toValue: 1,
      duration: DRAW_MS,
      useNativeDriver: true,
    });
    drawing.start();
    return () => drawing.stop();
  }, [draw, announce]);
  return (
    <Pressable
      style={[StyleSheet.absoluteFill, styles.scrim]}
      onPress={onClose}
      accessibilityRole="button"
      accessibilityLabel={t("Close")}
      testID="unlock-card"
    >
      <Pressable style={styles.card} onPress={() => {}} accessible={false}>
        <Text style={styles.title}>{title}</Text>
        <ShapeOutline
          outline={outline}
          size={size}
          color={tint}
          thickness={5}
          draw={draw}
          testID="unlock-drawing"
        />
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.line}>{line}</Text>
        <View style={styles.buttons}>
          <Tap
            style={styles.button}
            onPress={onClose}
            accessibilityRole="button"
            testID="unlock-close"
          >
            <Text style={styles.buttonText}>{t("Close")}</Text>
          </Tap>
          <Tap
            style={[styles.button, styles.buttonMain]}
            onPress={onPlay}
            accessibilityRole="button"
            testID="unlock-play"
          >
            <Text style={[styles.buttonText, styles.buttonMainText]}>
              {t("See collection")}
            </Text>
          </Tap>
        </View>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: color.scrim,
    alignItems: "center",
    justifyContent: "center",
    padding: space.lg,
  },
  card: {
    alignItems: "center",
    alignSelf: "stretch",
    padding: space.lg,
    borderRadius: radius.sheet,
    backgroundColor: color.surface,
    gap: space.sm,
  },
  title: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  name: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  line: {
    color: color.textMuted,
    fontSize: fontSize.body,
    textAlign: "center",
  },
  buttons: {
    flexDirection: "row",
    gap: space.sm,
    marginTop: space.md,
    alignSelf: "stretch",
  },
  button: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
    paddingHorizontal: space.md,
  },
  buttonMain: {
    backgroundColor: color.accent,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  buttonMainText: {
    color: color.onAccent,
  },
});
