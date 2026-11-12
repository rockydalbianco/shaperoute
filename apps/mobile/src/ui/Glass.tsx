import type { ReactNode } from "react";
import { type StyleProp, View, type ViewProps, type ViewStyle } from "react-native";

import { color, glass, type GlassColors, type Palette, radius } from "../theme/tokens";
import { type GlassMode, useGlassMode } from "./useGlassMode";

/**
 * The face of a piece of glass in `mode` (TASK-469, ADR-0383).
 *
 * `glass`: the tone's background at `GLASS_VEIL`, a rim of light brighter
 * on top and a soft shadow under it. The rim is drawn inside, with inset
 * shadows, so it never moves what the glass holds.
 * `solid` («Reduce Transparency»): `surface`, opaque, with a thin `border`
 * edge and the same shadow.
 * `contrast` («Increase Contrast»): `surface`, opaque, with a `borderStrong`
 * edge, as the controls that must be found in sunlight (TASK-086).
 */
export function glassStyle(
  mode: GlassMode,
  colors: GlassColors = glass,
  palette: Palette = color,
): ViewStyle {
  const cast = { offsetX: 0, offsetY: 8, blurRadius: 24, color: colors.shadow };
  const edge = (of: string) => ({
    inset: true,
    offsetX: 0,
    offsetY: 0,
    blurRadius: 0,
    spreadDistance: 1,
    color: of,
  });
  if (mode === "glass") {
    return {
      backgroundColor: colors.fill,
      boxShadow: [
        cast,
        edge(colors.rim),
        { inset: true, offsetX: 0, offsetY: 1, blurRadius: 0, color: colors.rimTop },
      ],
    };
  }
  return {
    backgroundColor: palette.surface,
    boxShadow: [
      cast,
      edge(mode === "contrast" ? palette.borderStrong : palette.border),
    ],
  };
}

type Props = Omit<ViewProps, "style"> & {
  /** The corners: a capsule unless told otherwise. */
  corner?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** The mode, for a screen that already knows it; the phone's otherwise. */
  mode?: GlassMode;
};

/**
 * A piece of glass (TASK-469, ADR-0383): what floats over the pages — the
 * tab bar first. It follows «Reduce Transparency» and «Increase Contrast».
 * Never yellow: the yellow is the route's.
 */
export function Glass({ corner = radius.pill, style, children, mode, ...rest }: Props) {
  const asked = useGlassMode();
  return (
    <View
      {...rest}
      style={[glassStyle(mode ?? asked), { borderRadius: corner }, style]}
    >
      {children}
    </View>
  );
}
