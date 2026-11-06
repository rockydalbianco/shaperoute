import { StyleSheet, Text, View } from "react-native";

import type { Activity } from "../api/activities";
import { color, fontSize } from "../theme/tokens";

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

/**
 * What a swim in a pool shows in «My activities» in place of the line
 * (TASK-400 part B), as the gym's tile (GymTile): the MuW yellow with 🏊.
 * Its post, with lengths and metres on it, is part C's.
 */
export function PoolTile({ width, height }: { width: number; height: number }) {
  return (
    <View
      style={[styles.tile, { width, height }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="pool-tile"
    >
      <Text style={styles.emoji}>🏊</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.accent,
  },
  emoji: {
    fontSize: fontSize.title,
  },
});
