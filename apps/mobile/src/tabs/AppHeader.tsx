import { type ReactNode, useEffect, useState } from "react";
import {
  Animated,
  type LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
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
  tone,
} from "../theme/tokens";
import { tourPart } from "../tour/tourParts";
import { TOUR_PART } from "../tour/tourSteps";
import { nativeGlassAvailable, nativeGlassView } from "../ui/NativeGlass";
import { type GlassMode, useGlassMode } from "../ui/useGlassMode";
import { useReduceMotion } from "../ui/useReduceMotion";

/** The side of the logo's yellow square, in points: as at the top of «Draw»
 * before it moved here. */
const BADGE_SIZE = 32;

/** How long the band takes to turn to glass and back, in milliseconds. */
export const BAND_FADE_MS = 200;

/**
 * Whether the header floats over the pages, which then go on under it:
 * only where the phone draws the real glass, as the tab bar (TASK-469 B3,
 * the user's choice of 2026-11-26 for the bar). Under the veiled glass of
 * part A what passes behind would show through the logo and the buttons,
 * so there the header keeps its place over the pages, as before.
 */
export function headerFloats(): boolean {
  return nativeGlassAvailable();
}

/** How tall the header is under a status bar this tall, before it is
 * measured. */
export function appHeaderHeight(topInset: number): number {
  return topInset + space.xs + MIN_TAP_SIZE + space.xs;
}

type Props = {
  /** At the right: the sport (SportButton). */
  action?: ReactNode;
  /** The page on screen has scrolled: the band is in glass (TASK-469 A5b). */
  scrolled?: boolean;
  /** Over the pages, in the phone's real glass (TASK-469 B3). */
  floating?: boolean;
  /** Its size, for the shell that leaves the pages its room. */
  onLayout?: (event: LayoutChangeEvent) => void;
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
export function AppHeader({
  action,
  scrolled = false,
  floating = false,
  onLayout,
}: Props) {
  const insets = useSafeAreaInsets();
  const mode = useGlassMode();
  const still = useReduceMotion();
  // Looked for once: a phone does not gain the glass while the app is open.
  const [RealGlass] = useState(() => (floating ? nativeGlassView() : null));
  // The phone's own glass for the band; with «Reduce Transparency» or
  // «Increase Contrast» the opaque band of part A, floating or not.
  const real = floating && RealGlass !== null && mode === "glass";
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
    <View
      style={[
        styles.header,
        floating && styles.floating,
        { paddingTop: insets.top + space.xs },
      ]}
      onLayout={onLayout}
      testID="app-header"
    >
      {/* The band: the page's colour at the top, glass once it scrolls. */}
      {real ? (
        // Never faded by opacity: at 0 the phone stops drawing the glass.
        // Its own switch instead, `none` at the top of a page. `regular`,
        // never `clear`, in the app's tone, tinted with the tone's own
        // background as every piece of real glass (`glass.realTint`): the
        // logo and the buttons keep their contrast over what passes behind.
        <RealGlass
          testID="header-band"
          pointerEvents="none"
          glassEffectStyle={{
            style: scrolled ? "regular" : "none",
            animate: !still,
            animationDuration: BAND_FADE_MS / 1000,
          }}
          colorScheme={tone.tone}
          tintColor={glass.realTint}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <Animated.View
          testID="header-band"
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, headerBandFace(mode), { opacity: shown }]}
        />
      )}
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
  // Where the glass is the phone's own: over the pages, which go on under
  // it (TASK-469 B3).
  floating: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
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
