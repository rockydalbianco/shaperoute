import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { color, radius } from "../theme/tokens";
import { estimateProgress, type WaitingPhase } from "./progress";

/** How often the bar moves on. */
export const TICK_MS = 250;

type Props = {
  phase: WaitingPhase;
  /** The distance asked for: long routes take longer to compute. */
  distanceM: number;
};

/**
 * The route being drawn, as a bar under the map (TASK-055). An estimate from
 * the phase and the time spent in it (progress.ts, ADR-0050): it never goes
 * back, and it fills only when the route arrives, which replaces it.
 */
export function LoadingBar({ phase, distanceM }: Props) {
  // When the current phase began; set by the effect, not during the render.
  const phaseStart = useRef<{ phase: WaitingPhase; at: number } | null>(null);
  const [shown, setShown] = useState(() => estimateProgress(phase, 0, distanceM));

  useEffect(() => {
    if (phaseStart.current?.phase !== phase) {
      phaseStart.current = { phase, at: Date.now() };
    }
    const began = phaseStart.current.at;
    const tick = () => {
      const seconds = (Date.now() - began) / 1000;
      const next = estimateProgress(phase, seconds, distanceM);
      setShown((before) => Math.max(before, next));
    };
    tick();
    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
  }, [phase, distanceM]);

  const percent = Math.round(shown * 100);
  return (
    <View
      style={styles.track}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Drawing the route"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      testID="loading"
    >
      <View style={[styles.fill, { width: `${shown * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  // Yellow: this is the route taking shape (ADR-0046, ADR-0050).
  fill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: color.accent,
  },
});
