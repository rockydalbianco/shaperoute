import { Pressable, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { findProfile } from "../sports";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { distanceLabel } from "../units/format";
import { usePendingWatchRuns } from "./useWatchRuns";
import {
  forgetWatchRun,
  openWatchRun,
  type PendingWatchRun,
  PHONE_WATCH_RUN_DOORS,
  type WatchRunDoors,
} from "./watchRuns";

/**
 * The workouts of the Apple Watch on top of «My activities» (TASK-370 part
 * B3c2, the user's choice «Avviso e scheda»): one card each, until it is
 * opened to the end of a run of always, with «Save», or discarded.
 */
export function WatchRunCard({
  doors = PHONE_WATCH_RUN_DOORS,
}: {
  doors?: WatchRunDoors;
}) {
  const runs = usePendingWatchRuns(doors);
  if (runs.length === 0) {
    return null;
  }
  return (
    <View style={styles.list}>
      {runs.map((run) => (
        <View key={run.id} style={styles.card} testID="watch-run">
          <Text style={styles.title}>{t("From your Apple Watch")}</Text>
          <Text style={styles.detail}>{detailOf(run)}</Text>
          <View style={styles.buttons}>
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
              onPress={() => openWatchRun(run, doors)}
              accessibilityRole="button"
              accessibilityLabel={`${t("Open")}, ${detailOf(run)}`}
            >
              <Text style={styles.buttonText}>{t("Open")}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
              onPress={() => forgetWatchRun(run.id, doors)}
              accessibilityRole="button"
              accessibilityLabel={`${t("Discard")}, ${detailOf(run)}`}
            >
              <Text style={styles.buttonText}>{t("Discard")}</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

/** «Star · 5.1 km», or the sport's name for a workout without a route. */
function detailOf({ track }: PendingWatchRun): string {
  const name = track.route?.title ?? t(findProfile(track.activity)?.name ?? "Run");
  return track.distanceM > 0 ? `${name} · ${distanceLabel(track.distanceM)}` : name;
}

const styles = StyleSheet.create({
  list: {
    gap: space.sm,
  },
  // As «Add past activity» below it (AddPastActivity.tsx).
  card: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  title: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  detail: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  buttons: {
    flexDirection: "row",
    gap: space.sm,
  },
  // Neutral, as every button of «My activities».
  button: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  pressed: {
    opacity: 0.6,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
