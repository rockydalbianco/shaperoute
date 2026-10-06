import { Pressable, StyleSheet, Text, View } from "react-native";

import { distanceLabel } from "../navigation/phrases";
import { durationMs } from "../navigation/trackRecorder";
import type { ScorableRun } from "../navigation/trackStore";
import { postOfTrack } from "../share/postRun";
import { SharePostButton } from "../share/SharePost";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { useUnits } from "../units/useUnits";

/**
 * The end of a run (TASK-113): over the map, which shows the run on its
 * route, how far and how long. No score: the app shows none and asks the
 * API for none (TASK-241, the user's choice).
 */

/** "32 min", "1 h 05 min": how long the run took, pauses included. */
export function durationLabel(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

export function FinishBanner() {
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>Your run</Text>
      <Text style={styles.message}>Yellow: the route. White: what you ran.</Text>
    </View>
  );
}

type Props = {
  run: ScorableRun;
  /** Leaves the screen, and the run with it. Absent when the way out is
   * not the card's: «Save» and «Discard», under it (TASK-172). */
  onDone?: () => void;
  /** Goes back to the run, when it was stopped and its route is still here. */
  onResume?: () => void;
};

export function FinishCard({ run, onDone, onResume }: Props) {
  // How far in the app's units (TASK-182): "4.0 km" or "2.5 mi".
  const units = useUnits();
  const facts = `${distanceLabel(run.track.distanceM, units)} · ${durationLabel(durationMs(run.track))}`;
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{facts}</Text>
      <View style={styles.buttons}>
        {/* The post of the run (TASK-231); it never has the score (TASK-241). */}
        <SharePostButton makeRun={() => postOfTrack(run.track, run.activity)} />
        {onResume && (
          <Pressable
            style={styles.button}
            onPress={onResume}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Keep running</Text>
          </Pressable>
        )}
        {onDone && (
          <Pressable style={styles.button} onPress={onDone} accessibilityRole="button">
            <Text style={styles.buttonText}>Done</Text>
          </Pressable>
        )}
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
  bannerText: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  card: {
    gap: space.md,
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
  buttons: {
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
