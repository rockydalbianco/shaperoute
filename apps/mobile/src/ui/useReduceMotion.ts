import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Whether the phone asks for less motion («Reduce Motion» on iOS, «Remove
 * animations» on Android): then the app's micro-animations stay still
 * (TASK-339, ADR-0293). Read once when mounted and followed after; until
 * the phone has answered, motion is on, as the setting is for most.
 */
export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(
      (on) => {
        if (mounted) {
          setReduced(on);
        }
      },
      () => {},
    );
    const listening = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      mounted = false;
      listening.remove();
    };
  }, []);
  return reduced;
}
