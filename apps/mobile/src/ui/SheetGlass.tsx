import type { ReactNode } from "react";
import type { ViewStyle } from "react-native";

import { useSheetFace } from "./sheetFace";

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
 * Until the real glass is here the face is the one of part A and there is
 * nothing behind: a sheet that takes this looks as it did.
 */
export function useGlassSheet(): readonly [face: ViewStyle, back: ReactNode] {
  return [useSheetFace(), null];
}
