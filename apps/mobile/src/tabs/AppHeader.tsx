import { type ReactNode, useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BellButton } from "../bell/BellButton";
import { HeartBadge } from "../intro/HeartBadge";
import {
  color,
  fontSize,
  fontWeight,
  glass,
  type GlassColors,
  MIN_TAP_SIZE,
  type Palette,
  space,
} from "../theme/tokens";
import { tourPart } from "../tour/tourParts";
import { TOUR_PART } from "../tour/tourSteps";
import { type GlassMode, useGlassMode } from "../ui/useGlassMode";
import { useReduceMotion } from "../ui/useReduceMotion";

/** The side of the logo's yellow square, in points: as at the top of «Draw»
 * before it moved here. */
const BADGE_SIZE = 32;

/** How long the band takes to turn to glass and back, in milliseconds. */
export const BAND_FADE_MS = 200;

type Props = {
  /** At the right: the sport (SportButton). */
  action?: ReactNode;
  /** The page on screen has scrolled: the band is in glass (TASK-469 A5b). */
  scrolled?: boolean;
};

/**
 * The band of the header once the page has scrolled (TASK-469 A5b,
 * ADR-0383): glass, with its edge of light at the bottom and a short shadow
 * over the content. «Reduce Transparency» makes it opaque with the thin
 * line of a division; «Increase Contrast» with the strong edge.
 */
export function headerBandFace(
  mode: GlassMode,
  colors: GlassColors = glass,
  palette: Palette = color,
): ViewStyle {
  if (mode === "glass") {
    return {
      backgroundColor: colors.fill,
      boxShadow: [
        { inset: true, offsetX: 0, offsetY: -1, blurRadius: 0, color: colors.rim },
        { offsetX: 0, offsetY: 2, blurRadius: 8, color: colors.shadow },
      ],
    };
  }
  return {
    backgroundColor: palette.background,
    borderBottomWidth: mode === "contrast" ? 1 : StyleSheet.hairlineWidth,
    borderBottomColor: mode === "contrast" ? palette.borderStrong : palette.hairline,
  };
}

/**
 * The header of the pages of the tab bar (TASK-367, ADR-0311): the logo,
 * the heart of the launch on its yellow and «MuW» (TASK-221), at the left;
 * the bell (part C) and the sport at the right, under the status bar and
 * the Dynamic Island. The same on every page: what page is on screen the
 * tab bar says.
 */
export function AppHeader({ action, scrolled = false }: Props) {
  const insets = useSafeAreaInsets();
  const mode = useGlassMode();
  const still = useReduceMotion();
  const [shown] = useState(() => new Animated.Value(scrolled ? 1 : 0));
  useEffect(() => {
    const to = scrolled ? 1 : 0;
    if (still) {
      shown.setValue(to);
      return;
    }
    const fade = Animated.timing(shown, {
      toValue: to,
      duration: BAND_FADE_MS,
      useNativeDriver: true,
    });
    fade.start();
    return () => fade.stop();
  }, [scrolled, still, shown]);
  return (
    <View style={[styles.header, { paddingTop: insets.top + space.xs }]}>
      {/* The band: the page's colour at the top, glass once it scrolls. */}
      <Animated.View
        testID="header-band"
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, headerBandFace(mode), { opacity: shown }]}
      />
      {/* The brand, not a control: read once, as its name. */}
      <View style={styles.brand} accessible accessibilityLabel="MuW">
        <HeartBadge size={BADGE_SIZE} />
        <Text style={styles.name}>MuW</Text>
      </View>
      <View style={styles.right}>
        <BellButton />
        {action && (
          // The sport, shown by the tour (TASK-266).
          <View ref={tourPart(TOUR_PART.header)} collapsable={false}>
            {action}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    // Over the pages, so the band's shadow falls on them.
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.xs,
    minHeight: MIN_TAP_SIZE,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: MIN_TAP_SIZE,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  name: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
});
