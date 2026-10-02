import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { type FreeRun, kmLabel } from "../navigation/freeRun";
import { distanceLabel } from "../navigation/phrases";
import {
  AT_START_M,
  compassWords,
  headingDeg,
  relativeDeg,
  toStart,
} from "../navigation/runStats";
import { emptyTrack, type Track } from "../navigation/trackRecorder";
import type { FreeRunState } from "../navigation/useFreeRun";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { RunCard } from "./RunDashboard";
import { RunGrid, useRunNumbers } from "./RunPanel";

/**
 * A run without a route (TASK-149): over the map that follows the runner,
 * where the start is and which way the runner heads; under it the run's
 * card, with its two pages (TASK-169). At the end, how far, how long and
 * the rest of the numbers, and the line that was run.
 */

export function FreeRunBanner({ state }: { state: FreeRunState }) {
  if (state.status === "denied") {
    return (
      <View style={styles.banner}>
        <Text style={styles.message}>
          Location is off for Sgrava: allow it in Settings to record a run.
        </Text>
      </View>
    );
  }
  return <StartPointer track={state.status === "running" ? state.track : null} />;
}

/** Where the start is and which way the runner heads: over the map, and on
 * the page of the data in its place. */
function StartPointer({
  track,
  flat = false,
}: {
  track: Track | null;
  flat?: boolean;
}) {
  const heading = useMemo(() => (track ? headingDeg(track) : null), [track]);
  const start = useMemo(() => (track ? toStart(track) : null), [track]);
  const box = flat ? styles.flat : styles.banner;
  if (start === null) {
    return (
      <View style={box}>
        <Text style={styles.message}>Finding your position…</Text>
      </View>
    );
  }
  const headingText = heading === null ? null : `Heading ${compassWords(heading)}`;
  if (start.distanceM < AT_START_M) {
    return (
      <View style={box}>
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
      style={box}
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
  /** The GPS is on: there is a run to pause, and pocket mode makes sense. */
  running: boolean;
  /** The line run so far, for the numbers (TASK-164). */
  track?: Track;
  onStop: () => void;
}) {
  return (
    <RunCard
      track={track}
      live={running}
      heading={<StartPointer track={running ? track : null} flat />}
      onStop={onStop}
    />
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
  // A run that is over: its clock stands at the last fix.
  const numbers = useRunNumbers(track, false);
  return (
    <View style={styles.finish}>
      <Text
        style={styles.total}
        accessibilityLabel={`Distance: ${kmLabel(track.distanceM)}`}
      >
        {kmLabel(track.distanceM)}
      </Text>
      <RunGrid numbers={numbers} />
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

const box = {
  gap: space.xs,
  padding: space.md,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: color.borderStrong,
  backgroundColor: color.surfaceRaised,
} as const;

const styles = StyleSheet.create({
  // Alone at the top of the map: it takes the width the way back leaves.
  banner: {
    ...box,
    flex: 1,
  },
  // On the page of the data: as tall as what it says.
  flat: box,
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
  finish: {
    gap: space.md,
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
