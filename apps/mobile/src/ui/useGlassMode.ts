import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * How the glass is drawn (TASK-469, ADR-0383):
 * - `glass`: see-through, with its rim of light and its shadow;
 * - `solid`: opaque, for «Reduce Transparency» on iOS;
 * - `contrast`: opaque with a strong edge, for «Increase Contrast» on iOS
 *   and «High contrast text» on Android.
 */
export type GlassMode = "glass" | "solid" | "contrast";

/** The mode the phone's settings ask for: contrast wins over transparency. */
export function glassModeOf(
  reduceTransparency: boolean,
  increaseContrast: boolean,
): GlassMode {
  if (increaseContrast) {
    return "contrast";
  }
  return reduceTransparency ? "solid" : "glass";
}

/**
 * The glass mode the phone asks for, read once when mounted and followed
 * after, like `useReduceMotion`. Until the phone has answered, the glass
 * is see-through, as the settings are for most. Each question answers
 * `false` on the platform that does not have it.
 */
export function useGlassMode(): GlassMode {
  const [clear, setClear] = useState(false);
  const [darker, setDarker] = useState(false);
  const [highText, setHighText] = useState(false);
  useEffect(() => {
    let mounted = true;
    const ask = (question: () => Promise<boolean>, set: (on: boolean) => void) =>
      question().then(
        (on) => {
          if (mounted) {
            set(on);
          }
        },
        () => {},
      );
    ask(() => AccessibilityInfo.isReduceTransparencyEnabled(), setClear);
    ask(() => AccessibilityInfo.isDarkerSystemColorsEnabled(), setDarker);
    ask(() => AccessibilityInfo.isHighTextContrastEnabled(), setHighText);
    const listening = [
      AccessibilityInfo.addEventListener("reduceTransparencyChanged", setClear),
      AccessibilityInfo.addEventListener("darkerSystemColorsChanged", setDarker),
      AccessibilityInfo.addEventListener("highTextContrastChanged", setHighText),
    ];
    return () => {
      mounted = false;
      for (const each of listening) {
        each.remove();
      }
    };
  }, []);
  return glassModeOf(clear, darker || highText);
}
