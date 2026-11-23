import type { ViewStyle } from "react-native";

import { segmentTrackFace } from "../screens/Segmented";
import { color, glass, type GlassColors, type Palette, radius } from "../theme/tokens";
import { type GlassMode, useGlassMode } from "../ui/useGlassMode";

/**
 * A group of rows of «Settings» in `mode` (TASK-469 A6, ADR-0383,
 * «Capsula»): the corners at 24 and the edges of the laid glass of the
 * segments — the thin rim all round and the light on top. The face stays
 * `surface`, so the words of the rows keep the contrast they had. With
 * «Reduce Transparency» it is as before, `surface` edged in `border`; with
 * «Increase Contrast» the edge is `borderStrong`.
 *
 * It goes over the group's own style, which keeps its layout.
 */
export function settingsGroupFace(
  mode: GlassMode,
  colors: GlassColors = glass,
  palette: Palette = color,
): ViewStyle {
  return {
    ...segmentTrackFace(mode, colors, palette),
    backgroundColor: palette.surface,
    borderWidth: 0,
    borderRadius: radius.group,
  };
}

/** The face of a group of rows of «Settings», as the phone asks for it. */
export function useSettingsGroup(): ViewStyle {
  return settingsGroupFace(useGlassMode());
}
