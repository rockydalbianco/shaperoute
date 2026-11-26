import { type ReactNode, useState } from "react";
import { StyleSheet, type ViewStyle } from "react-native";

import { glass, radius, tone } from "../theme/tokens";
import { nativeGlassView } from "./NativeGlass";
import { useSheetFace } from "./sheetFace";
import { useGlassMode } from "./useGlassMode";

/**
 * A sheet from the bottom that can be made of the phone's real glass
 * (TASK-469 part B4, ADR-0383). The real glass is a view, not a style, so
 * a sheet takes two things: the face for its own box, after its own style
 * as `useSheetFace()` was, and what goes behind its content, as the first
 * child of that box:
 *
 *     const [glassSheet, glassBack] = useGlassSheet();
 *     <View style={[styles.sheet, glassSheet]}>
 *       {glassBack}
 *       …
 *
 * Where the phone draws the real glass, the box loses its opaque fill and
 * the glass fills it behind what the sheet holds: `regular`, never
 * `clear`, in the app's tone, tinted with the tone's own background as
 * every piece of real glass (`glass.realTint`), and never in the way of
 * a touch. Everywhere else — a build without the glass, Android, an iPhone
 * before iOS 26, «Reduce Transparency», «Increase Contrast» — the face of
 * part A and nothing behind: the sheet looks as it did.
 */
export function useGlassSheet(): readonly [face: ViewStyle, back: ReactNode] {
  const mode = useGlassMode();
  const face = useSheetFace();
  // Looked for once: a phone does not gain the glass while the app is open.
  const [RealGlass] = useState(() => nativeGlassView());
  if (RealGlass === null || mode !== "glass") {
    return [face, null];
  }
  return [
    styles.clear,
    <RealGlass
      key="sheet-glass"
      testID="sheet-glass"
      pointerEvents="none"
      glassEffectStyle="regular"
      colorScheme={tone.tone}
      tintColor={glass.realTint}
      style={styles.back}
    />,
  ];
}

const styles = StyleSheet.create({
  // The sheet's own box under the phone's glass: the corners of part A, no
  // fill, rim or shadow of ours.
  clear: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderTopWidth: 0,
    backgroundColor: "transparent",
  },
  back: {
    ...StyleSheet.absoluteFill,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },
});
