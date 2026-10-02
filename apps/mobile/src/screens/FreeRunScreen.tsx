import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  clockLabel,
  elapsedMs,
  type FreeRun,
  kmLabel,
  paceLabel,
} from "../navigation/freeRun";
import { durationMs, type Track } from "../navigation/trackRecorder";
import type { FreeRunState } from "../navigation/useFreeRun";
import { usePocketMode } from "../navigation/usePocketMode";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { confirmPocketMode, PocketScreen } from "./PocketScreen";

/**
 * A run without a route (TASK-149): over the map that follows the runner,
 * how far, how long and the pace; under it, «Pocket» and «Stop». At the end,
 * the same three numbers and the line that was run.
 */

/** The clock ticks once a second. */
export const TICK_MS = 1000;

/** Now, again every `everyMs` while `on`. */
function useNow(on: boolean, everyMs: number): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!on) {
      return;
    }
    // Stale for at most a tick: the clock never goes below 0:00.
    const timer = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(timer);
  }, [on, everyMs]);
  return now;
}

/** "12:34 · 5:42 /km", or the time alone before the pace means anything. */
function timeAndPace(track: Track, ms: number): string {
  const pace = paceLabel(track.distanceM, ms);
  return pace === null ? clockLabel(ms) : `${clockLabel(ms)} · ${pace}`;
}

export function FreeRunBanner({ state }: { state: FreeRunState }) {
  const ticking = state.status === "running" && state.track.fixes.length > 0;
  const now = useNow(ticking, TICK_MS);
  if (state.status === "denied") {
    return (
      <View style={styles.banner}>
        <Text style={styles.message}>
          Location is off for Sgrava: allow it in Settings to record a run.
        </Text>
      </View>
    );
  }
  if (!ticking) {
    return (
      <View style={styles.banner}>
        <Text style={styles.message}>Finding your position…</Text>
      </View>
    );
  }
  const { track } = state;
  return (
    <View style={styles.banner}>
      <Text
        style={styles.km}
        accessibilityLabel={`Distance: ${kmLabel(track.distanceM)}`}
      >
        {kmLabel(track.distanceM)}
      </Text>
      <Text style={styles.time}>{timeAndPace(track, elapsedMs(track, now))}</Text>
    </View>
  );
}

export function FreeRunCard({
  running,
  onStop,
}: {
  /** The GPS is on: pocket mode makes sense. */
  running: boolean;
  onStop: () => void;
}) {
  const pocket = usePocketMode(running);
  return (
    <View style={styles.card}>
      <Text style={styles.left}>Run without a route</Text>
      <View style={styles.buttons}>
        {running && (
          <Pressable
            style={styles.button}
            onPress={() => confirmPocketMode(pocket.enter)}
            accessibilityRole="button"
            accessibilityLabel="Pocket mode"
          >
            <Text style={styles.buttonText}>Pocket</Text>
          </Pressable>
        )}
        <Pressable style={styles.button} onPress={onStop} accessibilityRole="button">
          <Text style={styles.buttonText}>Stop</Text>
        </Pressable>
      </View>
      <PocketScreen on={pocket.on} onExit={pocket.exit} />
    </View>
  );
}

export function FreeFinishBanner() {
  return (
    <View style={styles.banner}>
      <Text style={styles.title}>Your run</Text>
      <Text style={styles.message}>White: what you ran.</Text>
    </View>
  );
}

type FinishProps = {
  run: FreeRun;
  /** Goes back to the run, when its track can still go on. */
  onResume?: () => void;
  /** Leaves the screen, and the run with it. */
  onDone: () => void;
};

export function FreeFinishCard({ run, onResume, onDone }: FinishProps) {
  const { track } = run;
  return (
    <View style={styles.finish}>
      <View style={styles.result}>
        <Text
          style={styles.total}
          accessibilityLabel={`Distance: ${kmLabel(track.distanceM)}`}
        >
          {kmLabel(track.distanceM)}
        </Text>
        <Text style={styles.message}>{timeAndPace(track, durationMs(track))}</Text>
      </View>
      <View style={styles.finishButtons}>
        {onResume && (
          <Pressable
            style={styles.button}
            onPress={onResume}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Keep running</Text>
          </Pressable>
        )}
        <Pressable style={styles.button} onPress={onDone} accessibilityRole="button">
          <Text style={styles.buttonText}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flex: 1,
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  // Not the yellow: that is the route's and the main action's (ADR-0046).
  km: {
    color: color.text,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
  },
  time: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  title: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  message: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  left: {
    flex: 1,
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  buttons: {
    flexDirection: "row",
    gap: space.sm,
  },
  finish: {
    gap: space.md,
  },
  result: {
    gap: space.xs,
  },
  total: {
    color: color.text,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
  },
  finishButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: space.sm,
  },
  button: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
