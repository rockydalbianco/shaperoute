import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { clockLabel, type FreeRun, kmLabel, paceLabel } from "../navigation/freeRun";
import { distanceLabel } from "../navigation/phrases";
import {
  AT_START_M,
  compassWords,
  headingDeg,
  relativeDeg,
  toStart,
} from "../navigation/runStats";
import { durationMs, emptyTrack, type Track } from "../navigation/trackRecorder";
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
import { RunPanel } from "./RunPanel";

/**
 * A run without a route (TASK-149): over the map that follows the runner,
 * where the start is and which way the runner heads; under it the numbers
 * of the run (TASK-164), «Pocket» and «Stop». At the end, how far, how long
 * and the pace, and the line that was run.
 */

/** "12:34 · 5:42 /km", or the time alone before the pace means anything. */
function timeAndPace(track: Track, ms: number): string {
  const pace = paceLabel(track.distanceM, ms);
  return pace === null ? clockLabel(ms) : `${clockLabel(ms)} · ${pace}`;
}

export function FreeRunBanner({ state }: { state: FreeRunState }) {
  const track = state.status === "running" ? state.track : null;
  const heading = useMemo(() => (track ? headingDeg(track) : null), [track]);
  const start = useMemo(() => (track ? toStart(track) : null), [track]);
  if (state.status === "denied") {
    return (
      <View style={styles.banner}>
        <Text style={styles.message}>
          Location is off for Sgrava: allow it in Settings to record a run.
        </Text>
      </View>
    );
  }
  if (start === null) {
    return (
      <View style={styles.banner}>
        <Text style={styles.message}>Finding your position…</Text>
      </View>
    );
  }
  const headingText = heading === null ? null : `Heading ${compassWords(heading)}`;
  if (start.distanceM < AT_START_M) {
    return (
      <View style={styles.banner}>
        <Text style={styles.title}>You are at your start</Text>
        {headingText && <Text style={styles.message}>{headingText}</Text>}
      </View>
    );
  }
  // As the runner sees it: up is ahead. Before a heading, up is north, as
  // on the map.
  const turn = Math.round(relativeDeg(start.bearing, heading ?? 0));
  return (
    <View
      style={styles.banner}
      accessible
      accessibilityLabel={
        `Your start: ${distanceLabel(start.distanceM)} in a straight line, ` +
        `to the ${compassWords(start.bearing)}`
      }
    >
      <View style={styles.row}>
        <Text
          testID="start-arrow"
          style={[styles.arrow, { transform: [{ rotate: `${turn}deg` }] }]}
        >
          ↑
        </Text>
        <View style={styles.words}>
          <Text style={styles.distance}>{distanceLabel(start.distanceM)}</Text>
          <Text style={styles.title}>Your start, in a straight line</Text>
          {headingText && <Text style={styles.message}>{headingText}</Text>}
        </View>
      </View>
    </View>
  );
}

/** No line yet: one track, so the panel is not told again of nothing. */
const NO_TRACK = emptyTrack();

export function FreeRunCard({
  running,
  track = NO_TRACK,
  onStop,
}: {
  /** The GPS is on: pocket mode makes sense. */
  running: boolean;
  /** The line run so far, for the numbers (TASK-164). */
  track?: Track;
  onStop: () => void;
}) {
  const pocket = usePocketMode(running);
  return (
    <View style={styles.card}>
      <RunPanel track={track} ticking={running && track.fixes.length > 0} />
      <View style={styles.buttons}>
        {running && (
          <Pressable
            style={[styles.button, styles.wide]}
            onPress={() => confirmPocketMode(pocket.enter)}
            accessibilityRole="button"
            accessibilityLabel="Pocket mode"
          >
            <Text style={styles.buttonText}>Pocket</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.button, styles.wide]}
          onPress={onStop}
          accessibilityRole="button"
        >
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  // The colour of the start (ADR-0040), not the yellow: that is the route's
  // and the main action's (ADR-0046).
  arrow: {
    color: color.startHere,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
  },
  words: {
    flex: 1,
  },
  distance: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
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
    gap: space.md,
  },
  buttons: {
    flexDirection: "row",
    gap: space.sm,
  },
  // Side by side, as wide as each other: easier to hit while running.
  wide: {
    flex: 1,
    alignItems: "center",
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
