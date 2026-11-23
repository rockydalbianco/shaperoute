import { StyleSheet, type ViewStyle } from "react-native";

import { color, glass, type GlassColors, type Palette, radius } from "../theme/tokens";
import { type GlassMode, useGlassMode } from "./useGlassMode";

/**
 * A sheet from the bottom in `mode` (TASK-469 A7a, ADR-0383, «Capsula»):
 * the top corners at 28, as the cards of the glass, the thin rim of the
 * laid glass with the light caught by its top edge, and a soft shadow
 * cast up on what lies behind. The face stays `surface`, so the words of
 * the sheet keep the contrast they had. With «Reduce Transparency» it is
 * the sheet of the app as before, one physical pixel of `hairline` on top
 * (TASK-339 D); with «Increase Contrast» the top edge is `borderStrong`.
 *
 * It goes over the sheet's own style, which keeps its layout.
 */
export function sheetFace(
  mode: GlassMode,
  colors: GlassColors = glass,
  palette: Palette = color,
): ViewStyle {
  const corners: ViewStyle = {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    backgroundColor: palette.surface,
  };
  if (mode === "glass") {
    return {
      ...corners,
      borderTopWidth: 0,
      boxShadow: [
        { offsetX: 0, offsetY: -4, blurRadius: 24, color: colors.shadow },
        {
          inset: true,
          offsetX: 0,
          offsetY: 0,
          blurRadius: 0,
          spreadDistance: 1,
          color: colors.rim,
        },
        { inset: true, offsetX: 0, offsetY: 1, blurRadius: 0, color: colors.rimTop },
      ],
    };
  }
  if (mode === "contrast") {
    return { ...corners, borderTopWidth: 1, borderColor: palette.borderStrong };
  }
  return {
    ...corners,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
  };
}

/** The face of a sheet from the bottom, as the phone asks for it. */
export function useSheetFace(): ViewStyle {
  return sheetFace(useGlassMode());
}
