import type { RecordActivity } from "@shaperoute/shared-types";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { snowDay, snowParts } from "../activities/snowDay";
import { t } from "../i18n";
import type { FreeRun } from "../navigation/freeRun";
import { postOfTrack } from "../share/postRun";
import { SharePostButton } from "../share/SharePost";
import { DayChoices } from "../ski/DayChoices";
import { type SkiDaySection, SkiDaySections } from "../skimode/SkiDaySections";
import { SkiRuns } from "../skimode/SkiRuns";
import { profileOf } from "../sports";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { runDistanceLabel } from "../units/format";
import { paceUnit, speedUnit } from "../units/runFormat";
import type { Units } from "../units/units";
import { NO_NUMBER, Tile, useRunNumbers } from "./RunPanel";

/**
 * The end of a day on the snow (TASK-375 part C, ADR-0319), in place of a
 * run's numbers. Skiing: the kilometres of the descents, how many, the
 * metres skied down, the top and the average speed, the lifts and the
 * time. Cross-country: the distance, the average pace, the metres climbed
 * and the time; a day on snowshoes the same (TASK-413 part C, the
 * user's «Sì, vanno bene», 2026-11-12). Their calories too (TASK-424 part C2, the user's choice
 * of 2026-11-10): downhill counted on the descents alone.
 */

/** Metres a second in km/h or, with miles, in mph: "42.3". */
export function speedOf(mps: number | null, units: Units): string {
  if (mps === null) {
    return NO_NUMBER;
  }
  const kmh = mps * 3.6;
  return (units === "mi" ? kmh / 1.609344 : kmh).toFixed(1);
}

function countOf(count: number | null): string {
  return count === null ? NO_NUMBER : String(count);
}

type Props = {
  run: FreeRun;
  /** A day on the snow, or on snowshoes (TASK-413 part C), whose numbers
   * are cross-country's. */
  activity: RecordActivity | "snowshoeing";
  /** Goes back to the day, when its track can still go on. */
  onResume?: () => void;
  /** Leaves the screen, and the day with it. Absent when «Save» and
   * «Discard» are under it (TASK-172). */
  onDone?: () => void;
};

export function SnowFinishCard({ run, activity, onResume, onDone }: Props) {
  const { track } = run;
  // The time, the pace and the metres climbed as a run's; the calories of
  // the day's own sport.
  const numbers = useRunNumbers(track, false, undefined, undefined, activity);
  const day = useMemo(() => snowDay(track), [track]);
  // Downhill the metres skied, lifts left out (src/sports).
  const skiing = profileOf(activity).skied === true;
  const total = runDistanceLabel(skiing ? day.skiedM : track.distanceM, numbers.units);
  const speed = speedUnit(numbers.units);
  // «Summary · Map · Runs» of a day of skiing (TASK-429 part B, ADR-0357).
  const [section, setSection] = useState<SkiDaySection>("summary");
  const parts = useMemo(() => (skiing ? snowParts(track) : null), [skiing, track]);
  const shown: SkiDaySection = skiing ? section : "summary";
  return (
    <View style={styles.finish}>
      {skiing && <SkiDaySections section={section} onSection={setSection} />}
      {shown === "runs" && (
        <ScrollView style={styles.runs}>
          <SkiRuns
            parts={parts ?? []}
            speedText={(mps) => `${speedOf(mps, numbers.units)} ${speed}`}
          />
        </ScrollView>
      )}
      {shown === "summary" && (
        <>
          <Text
            style={styles.total}
            accessibilityLabel={
              skiing
                ? t("Skied: {distance}", { distance: total })
                : t("Distance: {distance}", { distance: total })
            }
          >
            {total}
          </Text>
          {skiing ? (
            <View style={styles.grid}>
              <View style={styles.tiles}>
                <Tile label={t("Descents")} value={countOf(day.descents)} />
                <Tile
                  label={t("Vertical")}
                  value={
                    day.verticalM === null
                      ? NO_NUMBER
                      : String(Math.round(day.verticalM))
                  }
                  unit="m"
                />
                <Tile
                  label={t("Top speed")}
                  value={speedOf(day.topMps, numbers.units)}
                  unit={speed}
                />
              </View>
              <View style={styles.tiles}>
                <Tile
                  label={t("Avg speed")}
                  value={speedOf(day.averageMps, numbers.units)}
                  unit={speed}
                />
                <Tile label={t("Lifts")} value={countOf(day.lifts?.length ?? null)} />
                <Tile label={t("Time")} value={numbers.time} />
              </View>
              {/* The whole day, descents and lifts together (TASK-406 part D2). */}
              <View style={styles.tiles}>
                <Tile
                  label={t("Total")}
                  value={runDistanceLabel(track.distanceM, numbers.units)}
                />
                {numbers.energy !== null && (
                  <Tile
                    label={t("Calories")}
                    value={numbers.energy}
                    unit="kcal"
                    energy
                  />
                )}
              </View>
            </View>
          ) : (
            <View style={styles.tiles}>
              <Tile
                label={t("Avg pace")}
                value={numbers.average}
                unit={paceUnit(numbers.units)}
              />
              <Tile label={t("Elev. gain")} value={numbers.climb} unit="m" />
              <Tile label={t("Time")} value={numbers.time} />
            </View>
          )}
          {!skiing && numbers.energy !== null && (
            <View style={styles.tiles}>
              <Tile label={t("Calories")} value={numbers.energy} unit="kcal" energy />
            </View>
          )}
          {/* The snow and the gear of the day, sent with it at «Save». */}
          {skiing && <DayChoices />}
        </>
      )}
      <View style={styles.buttons}>
        {/* The post of the day (TASK-231): a line, as a run without a route. */}
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
  // The day's parts scroll in a card that leaves the map in sight.
  runs: {
    maxHeight: 320,
  },
  total: {
    color: color.text,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
  },
  grid: {
    gap: space.sm,
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
