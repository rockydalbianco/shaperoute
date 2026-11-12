import type { RecordActivity } from "@shaperoute/shared-types";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import type { FreeRun } from "../navigation/freeRun";
import { NO_NUMBER, Tile, useRunNumbers } from "../screens/RunPanel";
import { speedOf } from "../screens/SnowFinishCard";
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
import { runDistanceLabel } from "../units/format";
import { speedUnit } from "../units/runFormat";
import { flightNow, topSpeedMps } from "./flight";

/**
 * The end of a flight (TASK-305 part R2, ADR-0375), in place of a run's
 * numbers: the distance in large; under it the time of the flight, the
 * highest altitude, the metres climbed, the top speed and the calories (the
 * MET of the flight, src/sports/paragliding.ts).
 */

type Props = {
  run: FreeRun;
  activity: RecordActivity;
  /** Goes back to the flight, when its track can still go on. */
  onResume?: () => void;
  /** Leaves the screen, and the flight with it. Absent when «Save» and
   * «Discard» are under it (TASK-172). */
  onDone?: () => void;
};

export function FlightFinishCard({ run, activity, onResume, onDone }: Props) {
  const { track } = run;
  const numbers = useRunNumbers(track, false, undefined, undefined, activity);
  const highest = useMemo(() => {
    const last = track.fixes[track.fixes.length - 1];
    return last === undefined ? null : flightNow(track, last.timeMs).maxAltM;
  }, [track]);
  const top = useMemo(() => topSpeedMps(track), [track]);
  const total = runDistanceLabel(track.distanceM, numbers.units);
  return (
    <View style={styles.finish} testID="flight-finish">
      <Text
        style={styles.total}
        accessibilityLabel={t("Distance: {distance}", { distance: total })}
      >
        {total}
      </Text>
      {/* Two to a row: «Max altitude» is cut short three abreast. */}
      <View style={styles.tiles}>
        <Tile label={t("Flight time")} value={numbers.time} />
        <Tile
          label={t("Max altitude")}
          value={highest === null ? NO_NUMBER : String(highest)}
          unit="m"
        />
      </View>
      <View style={styles.tiles}>
        <Tile label={t("Elev. gain")} value={numbers.climb} unit="m" />
        <Tile
          label={t("Top speed")}
          value={speedOf(top, numbers.units)}
          unit={speedUnit(numbers.units)}
        />
      </View>
      {numbers.energy !== null && (
        <View style={styles.tiles}>
          <Tile label={t("Calories")} value={numbers.energy} unit="kcal" energy />
        </View>
      )}
      <View style={styles.buttons}>
        <SharePostButton makeRun={() => postOfTrack(track)} />
        {onResume && (
          <Pressable
            style={styles.button}
            onPress={onResume}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>{t("Keep running")}</Text>
          </Pressable>
        )}
        {onDone && (
          <Pressable style={styles.button} onPress={onDone} accessibilityRole="button">
            <Text style={styles.buttonText}>{t("Done")}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  finish: {
    gap: space.md,
  },
  total: {
    color: color.text,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
  },
  tiles: {
    flexDirection: "row",
    gap: space.sm,
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
