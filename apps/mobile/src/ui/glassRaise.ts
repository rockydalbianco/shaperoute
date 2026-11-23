import type { ViewStyle } from "react-native";

import { glass, type GlassColors } from "../theme/tokens";
import type { GlassMode } from "./useGlassMode";

/**
 * What stands out of the glass in `mode` (TASK-469, ADR-0383, «Capsula»):
 * a line of light on top, drawn inside, and a short shadow under it — the
 * pill of the segments, the chips. It adds no colour: the control keeps its
 * own face, the yellow of a choice made included. With «Reduce
 * Transparency» or «Increase Contrast» nothing is added: flat, as before.
 */
export function glassRaise(mode: GlassMode, colors: GlassColors = glass): ViewStyle {
  if (mode !== "glass") {
    return {};
  }
  return {
    boxShadow: [
      { offsetX: 0, offsetY: 2, blurRadius: 6, color: colors.shadow },
      { inset: true, offsetX: 0, offsetY: 1, blurRadius: 0, color: colors.rimTop },
    ],
  };
}
