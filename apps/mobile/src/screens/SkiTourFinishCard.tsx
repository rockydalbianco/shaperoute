import type { RecordActivity } from "@shaperoute/shared-types";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  type Changeover,
  type MountainPhase,
  type MountainTour,
  mountainTour,
} from "../activities/mountainPhases";
import { useSkinChanges } from "../activities/skinChanges";
import { t } from "../i18n";
import type { FreeRun } from "../navigation/freeRun";
import { durationText } from "../route/runTime";
import { postOfTrack } from "../share/postRun";
import { SharePostButton } from "../share/SharePost";
import { clockOf } from "../skimode/SkiRuns";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Hairline } from "../ui/Hairline";
import { runDistanceLabel } from "../units/format";
import { NO_NUMBER, Tile, useRunNumbers } from "./RunPanel";

/**
 * The end of a ski tour (TASK-415 part B, ADR-0344; the metrics are the
 * user's choice of 2026-11-07): the metres climbed in large; under them the
 * metres down, the time up and down, the VAM of the climbs, the highest
 * point, the kilometres and the time; then the phases one after the other,
 * each with when it began and how long it took, the changeovers between
 * them, and the VAM of each climb.
 */

/** A row of «Phases»: a phase, or a changeover between two. */
export type PhaseRow =
  { kind: "phase"; phase: MountainPhase } | { kind: "change"; change: Changeover };

/** The phases and the changeovers of `tour`, in the order of the day. */
export function phaseRows(tour: MountainTour): PhaseRow[] {
  const rows: PhaseRow[] = [
    ...tour.phases.map((phase) => ({ kind: "phase" as const, phase })),
    ...tour.changes.map((change) => ({ kind: "change" as const, change })),
  ];
  const at = (row: PhaseRow) =>
    row.kind === "phase" ? row.phase.startMs : row.change.atMs;
  return rows.sort((a, b) => at(a) - at(b));
}

/** "Climb 2", "Descent 1", "Lift 1". */
export function phaseTitle(phase: Pick<MountainPhase, "kind" | "n">): string {
  switch (phase.kind) {
    case "climb":
      return t("Climb {n}", { n: phase.n });
    case "descent":
      return t("Descent {n}", { n: phase.n });
    default:
      return t("Lift {n}", { n: phase.n });
  }
}

function metresOf(metres: number | null): string {
  return metres === null ? NO_NUMBER : String(Math.round(metres));
}

function timeOf(ms: number | null): string {
  return ms === null || ms <= 0 ? NO_NUMBER : durationText(ms / 1000);
}

type Props = {
  run: FreeRun;
  activity: RecordActivity;
  /** Goes back to the tour, when its track can still go on. */
  onResume?: () => void;
  /** Leaves the screen, and the tour with it. Absent when «Save» and
   * «Discard» are under it (TASK-172). */
  onDone?: () => void;
};

export function SkiTourFinishCard({ run, activity, onResume, onDone }: Props) {
  const { track } = run;
  // The time and the calories of the tour's own sport.
  const numbers = useRunNumbers(track, false, undefined, undefined, activity);
  // With the changeovers marked by hand (TASK-415 part B3).
  const byHand = useSkinChanges(track.fixes[0]?.timeMs ?? null);
  const tour = useMemo(() => mountainTour(track, byHand), [track, byHand]);
  const climbed = metresOf(tour?.climbM ?? null);
  return (
    <View style={styles.finish}>
      <View
        accessible
        accessibilityLabel={t("Climbed: {metres} m", { metres: climbed })}
      >
        <Text style={styles.total}>
          {climbed}
          <Text style={styles.unit}> m</Text>
        </Text>
        <Text style={styles.caption}>{t("Elev. gain")}</Text>
      </View>
      {/* Two to a row: the labels are long in Italian and German. */}
      <View style={styles.grid}>
        <View style={styles.tiles}>
          <Tile
            label={t("Elev. loss")}
            value={metresOf(tour?.lossM ?? null)}
            unit="m"
          />
          <Tile
            label={t("Avg VAM")}
            value={metresOf(tour?.vamMph ?? null)}
            unit="m/h"
          />
        </View>
        <View style={styles.tiles}>
          <Tile label={t("Time up")} value={timeOf(tour?.climbMs ?? null)} />
          <Tile label={t("Time down")} value={timeOf(tour?.descentMs ?? null)} />
        </View>
        <View style={styles.tiles}>
          <Tile
            label={t("Max altitude")}
            value={metresOf(tour?.topM ?? null)}
            unit="m"
          />
          <Tile
            label={t("Total")}
            value={runDistanceLabel(track.distanceM, numbers.units)}
          />
        </View>
        <View style={styles.tiles}>
          <Tile label={t("Time")} value={numbers.time} />
          {numbers.energy !== null && (
            <Tile label={t("Calories")} value={numbers.energy} unit="kcal" energy />
          )}
        </View>
      </View>
      {tour === null ? (
        <Text style={styles.note}>
          {t("No heights from the phone: no phases for this tour.")}
        </Text>
      ) : (
        tour.phases.length > 0 && (
          <View style={styles.phases}>
            <Text style={styles.heading}>{t("Phases")}</Text>
            <ScrollView style={styles.scroll}>
              <PhaseList tour={tour} />
            </ScrollView>
          </View>
        )
      )}
      <View style={styles.buttons}>
        {/* The post of the tour (TASK-231): a line, as a run without a route. */}
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

/** «Phases»: each phase and each changeover on a line of its own. */
export function PhaseList({ tour }: { tour: MountainTour }) {
  return (
    <View style={styles.list} testID="ski-tour-phases">
      {phaseRows(tour).map((row, at) => {
        const title =
          row.kind === "phase"
            ? phaseTitle(row.phase)
            : row.change.kind === "off"
              ? t("Skins off")
              : t("Skins on");
        const startMs = row.kind === "phase" ? row.phase.startMs : row.change.atMs;
        const ms = row.kind === "phase" ? row.phase.ms : row.change.ms;
        const time = clockOf(startMs);
        const duration = durationText(ms / 1000);
        const key =
          row.kind === "phase"
            ? `${row.phase.kind}-${row.phase.n}`
            : `change-${row.change.atMs}`;
        return (
          <View key={key}>
            {at > 0 && <Hairline />}
            <View
              style={styles.row}
              accessible
              accessibilityLabel={t("{phase}, from {time}, for {duration}", {
                phase: title,
                time,
                duration,
              })}
              testID={`ski-tour-${key}`}
            >
              <Text style={styles.clock}>{time}</Text>
              <View style={styles.words}>
                <Text style={row.kind === "phase" ? styles.name : styles.change}>
                  {title}
                </Text>
                <Text style={styles.detail}>{duration}</Text>
              </View>
              {row.kind === "phase" && (
                <View style={styles.numbers}>
                  <Text style={styles.name}>
                    {`${row.phase.kind === "descent" ? "−" : "+"}${Math.round(row.phase.heightM)} m`}
                  </Text>
                  {row.phase.vamMph !== null && (
                    <Text style={styles.detail}>
                      {`${Math.round(row.phase.vamMph)} m/h`}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        );
      })}
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
  unit: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.semibold,
  },
  caption: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  grid: {
    gap: space.sm,
  },
  tiles: {
    flexDirection: "row",
    gap: space.sm,
  },
  note: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  phases: {
    gap: space.xs,
  },
  heading: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  // The phases scroll in a card that leaves the map in sight.
  scroll: {
    maxHeight: 240,
  },
  list: {
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    paddingHorizontal: space.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.sm,
  },
  clock: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontVariant: ["tabular-nums"],
  },
  words: {
    flex: 1,
  },
  name: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  change: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  detail: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  numbers: {
    alignItems: "flex-end",
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
