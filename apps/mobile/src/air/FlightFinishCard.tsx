import type { RecordActivity } from "@shaperoute/shared-types";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { appBody } from "../body/bodyProfile";
import { t } from "../i18n";
import { clockLabel, type FreeRun } from "../navigation/freeRun";
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
import { flightParts, flightSplit, type FlightSide } from "./flightParts";
import { airTopSpeedMps, flightKcal } from "./flightSplit";
import { phaseMarksOf } from "./phaseMarks";

/**
 * The end of a flight (TASK-305 part R2, ADR-0375), in place of a run's
 * numbers: the distance in large; under it the time of the flight, the
 * highest altitude, the metres climbed, the top speed and the calories (the
 * MET of the flight, src/sports/paragliding.ts).
 *
 * A race on foot and in the air (TASK-305 part R6b): over them the total
 * time and a line for each kind, «On foot» with its time, distance and
 * metres climbed, «In the air» with its time, distance and highest point;
 * the calories counted part by part. A flight alone shows as before.
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
  const parts = useMemo(() => {
    const first = track.fixes[0]?.timeMs;
    return flightParts(track, first === undefined ? [] : phaseMarksOf(first));
  }, [track]);
  const split = flightSplit(parts);
  // A race: the speed and the time of the flight are its parts in the air.
  const flightTop = split === null ? top : airTopSpeedMps(track, parts);
  const energy =
    split === null || numbers.energy === null
      ? numbers.energy
      : String(flightKcal(parts, appBody(), new Date().getFullYear()));
  const side = (kind: "foot" | "air", of: FlightSide) =>
    [
      clockLabel(of.movingMs),
      runDistanceLabel(of.metres, numbers.units),
      kind === "foot"
        ? of.climbM === null
          ? null
          : `+${Math.round(of.climbM)} m`
        : of.maxAltM === null
          ? null
          : `${Math.round(of.maxAltM)} m`,
    ]
      .filter((part): part is string => part !== null)
      .join(" · ");
  return (
    <View style={styles.finish} testID="flight-finish">
      <Text
        style={styles.total}
        accessibilityLabel={t("Distance: {distance}", { distance: total })}
      >
        {total}
      </Text>
      {split !== null && (
        <View style={styles.split} testID="flight-split">
          <View style={styles.splitRow}>
            <Text style={styles.splitLabel}>{t("Total")}</Text>
            <Text style={styles.splitValue}>{numbers.time}</Text>
          </View>
          <View style={styles.splitRow}>
            <Text style={styles.splitLabel}>{t("On foot")}</Text>
            <Text style={styles.splitValue}>{side("foot", split.foot)}</Text>
          </View>
          <View style={styles.splitRow}>
            <Text style={styles.splitLabel}>{t("In the air")}</Text>
            <Text style={styles.splitValue}>{side("air", split.air)}</Text>
          </View>
        </View>
      )}
      {/* Two to a row: «Max altitude» is cut short three abreast. A race
          says its times and climb in its lines over them: one row less, so
          «Save» and «Discard» stay on the screen under the card. */}
      {split === null ? (
        <>
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
              value={speedOf(flightTop, numbers.units)}
              unit={speedUnit(numbers.units)}
            />
          </View>
        </>
      ) : (
        <View style={styles.tiles}>
          <Tile
            label={t("Max altitude")}
            value={highest === null ? NO_NUMBER : String(highest)}
            unit="m"
          />
          <Tile
            label={t("Top speed")}
            value={speedOf(flightTop, numbers.units)}
            unit={speedUnit(numbers.units)}
          />
        </View>
      )}
      {energy !== null && (
        <View style={styles.tiles}>
          <Tile label={t("Calories")} value={energy} unit="kcal" energy />
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
  split: {
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  splitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: space.md,
  },
  splitLabel: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  splitValue: {
    flexShrink: 1,
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
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
