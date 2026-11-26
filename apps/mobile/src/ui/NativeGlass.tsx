import { requireOptionalNativeModule } from "expo";
import { type ComponentType, type ReactNode, useState } from "react";
import { Platform, type StyleProp, type ViewProps, type ViewStyle } from "react-native";

import { radius, tone } from "../theme/tokens";
import { Glass } from "./Glass";
import { type GlassMode, useGlassMode } from "./useGlassMode";

/**
 * The real Liquid Glass of iOS 26 (TASK-469 part B, ADR-0383), where the
 * phone and the app have it; everywhere else the veiled glass of part A
 * (`Glass`), which is what every phone sees today.
 *
 * expo-glass-effect is loaded only when it is used, and only in an app
 * built with it, as expo-haptics is (`haptics/haptics.ts`): a build made
 * before it, Android and an iPhone before iOS 26 get the veil. Never an
 * error: glass that cannot be drawn is no problem of the runner's.
 */

type ExpoGlassEffect = typeof import("expo-glass-effect");
type GlassViewType = ExpoGlassEffect["GlassView"];

/** expo-glass-effect's native module (expo-glass-effect/src/GlassView.ios.tsx). */
const NATIVE_MODULE = "ExpoGlassEffect";

/** What the native module says of the phone it runs on. */
type NativeGlassModule = {
  /** False on the iOS 26 betas that came without the API (expo #40911). */
  isGlassEffectAPIAvailable?: boolean;
  /** Whether the app draws with the Liquid Glass design. */
  isLiquidGlassAvailable?: boolean;
};

/**
 * Whether this app, on this phone, can draw the real glass: on iOS, built
 * with expo-glass-effect, and with the API there. Asked of the native
 * module itself, so the package is not even loaded where it could throw.
 */
export function nativeGlassAvailable(): boolean {
  if (Platform.OS !== "ios") {
    return false;
  }
  try {
    const native = requireOptionalNativeModule<NativeGlassModule>(NATIVE_MODULE);
    return (
      native !== null &&
      native.isGlassEffectAPIAvailable === true &&
      native.isLiquidGlassAvailable === true
    );
  } catch {
    return false;
  }
}

/** expo-glass-effect's `GlassView`, loaded at its first use; null where the
 * real glass cannot be drawn. */
export function nativeGlassView(): GlassViewType | null {
  if (!nativeGlassAvailable()) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const library = require("expo-glass-effect") as ExpoGlassEffect;
    return library.GlassView ?? null;
  } catch {
    return null;
  }
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
 * A piece of glass, real where it can be. With «Reduce Transparency» or
 * «Increase Contrast» it is the opaque face of part A, as before: the
 * phone's own glass would still be drawn there, so the mode decides.
 * `regular`, never `clear`: what it holds must stay readable. The glass
 * follows the tone chosen in the app, not the phone's. Never yellow.
 */
export function NativeGlass({
  corner = radius.pill,
  style,
  children,
  mode,
  ...rest
}: Props) {
  const asked = useGlassMode();
  // Looked for once: a phone does not gain the glass while the app is open.
  const [GlassView] = useState<ComponentType<
    React.ComponentProps<GlassViewType>
  > | null>(() => nativeGlassView());
  const drawn = mode ?? asked;
  if (GlassView === null || drawn !== "glass") {
    return (
      <Glass {...rest} corner={corner} style={style} mode={drawn}>
        {children}
      </Glass>
    );
  }
  return (
    <GlassView
      {...rest}
      glassEffectStyle="regular"
      colorScheme={tone.tone}
      style={[{ borderRadius: corner }, style]}
    >
      {children}
    </GlassView>
  );
}
