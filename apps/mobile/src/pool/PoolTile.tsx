import type { PoolSwimFigures } from "@shaperoute/shared-types";
import { StyleSheet, Text, View } from "react-native";

import type { Activity } from "../api/activities";
import { t } from "../i18n";
import { clockLabel } from "../navigation/freeRun";
import { color, font, fontSize, fontWeight, space } from "../theme/tokens";
import { metresLabel } from "./PoolDraw";
import { pacePer100S } from "./poolSwim";

/** Whether `run` is a swim in a pool (TASK-400 part B): a swim saved
 * without a track and without a route. */
export function isPoolSwimRun(
  run: Pick<Activity, "activity" | "route_preview" | "track_preview">,
): boolean {
  return (
    run.activity === "swimming" &&
    run.route_preview === null &&
    run.track_preview.length === 0
  );
}

/** Whether a post or a drawing of `activity` with `line` is a swim in a
 * pool (TASK-400 part C): a swim without a line. A swim in open water
 * always has one. */
export function isPoolLine(
  activity: string | null | undefined,
  line: readonly unknown[] | null | undefined,
): boolean {
  return (
    activity === "swimming" &&
    (line === null || line === undefined || line.length === 0)
  );
}

/** «Lengths 60 · 25 m»: the lengths and the pool of a swim. */
export function lengthsLabel(figures: PoolSwimFigures): string {
  return `${t("Lengths")} ${figures.lengths} · ${metresLabel(figures.pool_length_m)}`;
}

type Props = {
  width: number;
  height: number;
  /** The swim's seconds; none, the tile shows only what it is (a
   * thumbnail). */
  durationS?: number;
  /** Its metres. */
  metres?: number;
  /** Its pool and lengths (GET /drawings/{id}/pool-swim); null while they
   * come or for an app that is not given them. */
  figures?: PoolSwimFigures | null;
};

/**
 * What a swim in a pool shows in place of the line (TASK-400 parts B and
 * C), as the gym's tile (GymTile): the MuW yellow with 🏊; full size, «Pool
 * swim», the lengths and the pool, the metres and the time, and the pace
 * /100 m. In «My activities» a thumbnail; in the Feed, the card, the grids,
 * the search and the picture shared, full size. A screen reader hears the
 * card's words, not the tile's.
 */
export function PoolTile({ width, height, durationS, metres, figures = null }: Props) {
  const small = durationS === undefined;
  const pace =
    durationS === undefined || metres === undefined
      ? null
      : pacePer100S(durationS, metres);
  return (
    <View
      style={[styles.tile, { width, height }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="pool-tile"
    >
      <Text style={small ? styles.emojiSmall : styles.emoji}>🏊</Text>
      {!small && (
        <>
          <Text style={styles.name}>{t("Pool swim")}</Text>
          {figures !== null && (
            <Text style={styles.line} testID="pool-tile-lengths">
              {lengthsLabel(figures)}
            </Text>
          )}
          <Text style={styles.big} testID="pool-tile-facts">
            {metres === undefined
              ? clockLabel(durationS * 1000)
              : `${metres} m · ${clockLabel(durationS * 1000)}`}
          </Text>
          {pace !== null && (
            <Text style={styles.line} testID="pool-tile-pace">
              {`${t("Pace /100 m")} ${clockLabel(pace * 1000)}`}
            </Text>
          )}
          {/* When its owner shows it (TASK-409 part B). */}
          {figures?.heart_avg_bpm !== undefined && (
            <Text style={styles.line} testID="pool-tile-heart">
              {`${t("Avg heart rate")} ${figures.heart_avg_bpm} bpm`}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    backgroundColor: color.accent,
  },
  emoji: {
    fontSize: fontSize.display,
  },
  emojiSmall: {
    fontSize: fontSize.title,
  },
  name: {
    ...font.label,
    color: color.onAccent,
  },
  big: {
    ...font.title,
    color: color.onAccent,
    fontWeight: fontWeight.medium,
    fontVariant: ["tabular-nums"],
  },
  line: {
    ...font.label,
    color: color.onAccent,
    fontVariant: ["tabular-nums"],
  },
});
