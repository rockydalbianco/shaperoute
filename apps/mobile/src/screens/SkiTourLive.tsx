import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  liveVam,
  mountainTour,
  type TourNow,
  tourNow,
} from "../activities/mountainPhases";
import {
  endSkinChange,
  openSkinChange,
  type SkinChange,
  startSkinChange,
  useSkinChanges,
} from "../activities/skinChanges";
import { t } from "../i18n";
import { metresBetween } from "../map/coordinates";
import { clockLabel } from "../navigation/freeRun";
import { openPause, type Track } from "../navigation/trackRecorder";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { NO_NUMBER, Tile, TICK_MS, useNow } from "./RunPanel";

/**
 * A ski tour as it goes (TASK-415 part B, ADR-0344), over the numbers of
 * the run: the phase it is in, the VAM of the last five minutes on a
 * climb, the metres climbed so far and the height. The time and the
 * kilometres are the run's, under it. «Changeover» marks one by hand
 * (TASK-415 part B3): its time runs in «Phase» until «Resume», or until
 * the tour has moved MOVED_ON_M away.
 */

/** A changeover marked by hand ends by itself this far from where it began. */
export const MOVED_ON_M = 30;

/** When the tour has moved MOVED_ON_M from where `open` began: the time of
 * the fix that went that far, or null while it has not. */
export function movedOnAt(track: Track, open: SkinChange): number | null {
  const fixes = track.fixes;
  let from = fixes.length - 1;
  while (from > 0 && fixes[from].timeMs > open.fromMs) {
    from -= 1;
  }
  const start = fixes[from];
  if (start === undefined) {
    return null;
  }
  for (let index = from + 1; index < fixes.length; index += 1) {
    if (metresBetween(start.point, fixes[index].point) >= MOVED_ON_M) {
      return fixes[index].timeMs;
    }
  }
  return null;
}

/** What the phase is called, in English: where it is shown, `t(name)`. */
export function phaseName(now: TourNow): string {
  switch (now) {
    case "climb":
      return t("Climb");
    case "descent":
      return t("Descent");
    case "lift":
      return t("Lift");
    case "change":
      return t("Changeover");
    default:
      return NO_NUMBER;
  }
}

export function SkiTourLive({ track, live }: { track: Track; live: boolean }) {
  const paused = openPause(track) !== null;
  // A changeover is told by the time the tour stands still: the clock
  // ticks while the run goes on.
  const now = useNow(live && !paused, TICK_MS);
  // The tour is told by its first fix: the marks of another are not its.
  const tourMs = track.fixes[0]?.timeMs ?? null;
  const byHand = useSkinChanges(tourMs);
  const open = openSkinChange(byHand);
  // Once per fix, not once per second.
  const tour = useMemo(() => mountainTour(track, byHand), [track, byHand]);
  const at = live ? now : (track.fixes[track.fixes.length - 1]?.timeMs ?? 0);
  const phase = tourNow(track, tour, at, paused, byHand);
  // Moving on ends a changeover marked and not ended.
  const movedOn = open === null ? null : movedOnAt(track, open);
  useEffect(() => {
    if (tourMs !== null && movedOn !== null) {
      endSkinChange(tourMs, movedOn);
    }
  }, [tourMs, movedOn]);
  const vam = liveVam(track, tour, at);
  const height = track.fixes[track.fixes.length - 1]?.altitudeM;
  return (
    // Two to a row: «VAM 5 min» and «Elev. gain» are cut short four abreast.
    <View style={styles.box} testID="ski-tour-live">
      <View style={styles.row}>
        <Tile
          label={t("Phase")}
          value={phaseName(phase)}
          unit={open === null ? undefined : clockLabel(Math.max(0, at - open.fromMs))}
        />
        <Tile
          label={t("VAM 5 min")}
          value={vam === null ? NO_NUMBER : String(Math.round(vam))}
          unit="m/h"
        />
      </View>
      <View style={styles.row}>
        <Tile
          label={t("Elev. gain")}
          value={tour === null ? NO_NUMBER : String(Math.round(tour.climbM))}
          unit="m"
        />
        <Tile
          label={t("Altitude")}
          value={
            height === undefined || height === null || !Number.isFinite(height)
              ? NO_NUMBER
              : String(Math.round(height))
          }
          unit="m"
        />
      </View>
      {live && tourMs !== null && (
        <Pressable
          style={[styles.button, open !== null && styles.buttonOpen]}
          onPress={() =>
            open === null
              ? startSkinChange(tourMs, Date.now())
              : endSkinChange(tourMs, Date.now())
          }
          accessibilityRole="button"
          testID="skin-change"
        >
          <Text style={[styles.buttonText, open !== null && styles.buttonTextOpen]}>
            {open === null ? `🎿 ${t("Changeover")}` : t("Resume")}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  row: {
    flexDirection: "row",
    gap: space.sm,
  },
  // Wide and tall: tapped with gloves on, at a turn.
  button: {
    minHeight: MIN_TAP_SIZE + space.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  // During a changeover, the way back to the tour is the main action.
  buttonOpen: {
    borderColor: color.accent,
    backgroundColor: color.accent,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  buttonTextOpen: {
    color: color.onAccent,
  },
});
