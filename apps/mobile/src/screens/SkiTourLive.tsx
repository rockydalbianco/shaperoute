import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import {
  liveVam,
  mountainTour,
  type TourNow,
  tourNow,
} from "../activities/mountainPhases";
import { t } from "../i18n";
import { openPause, type Track } from "../navigation/trackRecorder";
import { color, radius, space } from "../theme/tokens";
import { NO_NUMBER, Tile, TICK_MS, useNow } from "./RunPanel";

/**
 * A ski tour as it goes (TASK-415 part B, ADR-0344), over the numbers of
 * the run: the phase it is in, the VAM of the last five minutes on a
 * climb, the metres climbed so far and the height. The time and the
 * kilometres are the run's, under it.
 */

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
  // Once per fix, not once per second.
  const tour = useMemo(() => mountainTour(track), [track]);
  const at = live ? now : (track.fixes[track.fixes.length - 1]?.timeMs ?? 0);
  const phase = tourNow(track, tour, at, paused);
  const vam = liveVam(track, tour, at);
  const height = track.fixes[track.fixes.length - 1]?.altitudeM;
  return (
    // Two to a row: «VAM 5 min» and «Elev. gain» are cut short four abreast.
    <View style={styles.box} testID="ski-tour-live">
      <View style={styles.row}>
        <Tile label={t("Phase")} value={phaseName(phase)} />
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
});
