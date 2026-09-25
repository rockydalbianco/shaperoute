import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet } from "react-native";

import { color, radius } from "../theme/tokens";
import {
  estimateProgress,
  isSlow,
  MAP_S,
  mapProgress,
  phaseSeconds,
  READING_S,
  readingProgress,
  type WaitingPhase,
} from "./progress";

/** How often the bar moves on. */
export const TICK_MS = 250;

/** What the bar says to a screen reader once a wait outlasts the usual. */
export const SLOW_TEXT = "Still waiting";

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
  return (
    <EstimateBar
      stage={phase}
      progressAt={(seconds) => estimateProgress(phase, seconds, distanceM)}
      usualS={phaseSeconds(phase, distanceM)}
      label="Drawing the route"
      testID="loading"
    />
  );
}

/** The AI reading the words the table does not know (TASK-058). */
export function ReadingBar() {
  return (
    <EstimateBar
      stage="reading"
      progressAt={readingProgress}
      usualS={READING_S}
      label="Reading the shape"
      testID="reading-loading"
    />
  );
}

/** The map and its tiles loading, over the map (TASK-058). */
export function MapLoadingBar() {
  return (
    <EstimateBar
      stage="map"
      progressAt={mapProgress}
      usualS={MAP_S}
      label="Loading the map"
      testID="map-loading"
    />
  );
}

type EstimateProps = {
  /** A new stage restarts the clock; the bar still never goes back. */
  stage: string;
  /** The share to fill after the seconds spent in this stage. */
  progressAt: (seconds: number) => number;
  /** Seconds the stage usually lasts: past twice this, the bar pulses. */
  usualS: number;
  label: string;
  testID: string;
};

/**
 * A bar that advances with the time spent waiting (ADR-0050). When the wait
 * outlasts twice the usual, the fill pulses: the app is still trying, even
 * if the estimate barely moves (ADR-0055).
 */
function EstimateBar({ stage, progressAt, usualS, label, testID }: EstimateProps) {
  // When the current stage began; set by the effect, not during the render.
  const stageStart = useRef<{ stage: string; at: number } | null>(null);
  // The latest estimate and pace, read by the timer without restarting it.
  const pace = useRef({ progressAt, usualS });
  useEffect(() => {
    pace.current = { progressAt, usualS };
  });
  const [shown, setShown] = useState(() => progressAt(0));
  const [slow, setSlow] = useState(false);
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (stageStart.current?.stage !== stage) {
      stageStart.current = { stage, at: Date.now() };
    }
    const began = stageStart.current.at;
    const tick = () => {
      const seconds = (Date.now() - began) / 1000;
      const next = pace.current.progressAt(seconds);
      setShown((before) => Math.max(before, next));
      setSlow(isSlow(seconds, pace.current.usualS));
    };
    tick();
    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
  }, [stage]);

  useEffect(() => {
    if (!slow) {
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => {
      pulse.stop();
      opacity.setValue(1);
    };
  }, [slow, opacity]);

  const percent = Math.round(shown * 100);
  return (
    <Animated.View
      style={styles.track}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: percent,
        ...(slow ? { text: SLOW_TEXT } : {}),
      }}
      testID={testID}
    >
      <Animated.View style={[styles.fill, { width: `${shown * 100}%`, opacity }]} />
    </Animated.View>
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
