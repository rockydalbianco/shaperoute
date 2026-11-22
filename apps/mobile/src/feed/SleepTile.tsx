import { StyleSheet, Text, View } from "react-native";

import { sleepSummaryOf } from "../api/sleep";
import { sleepPostsOn } from "../health/sleepModules";
import { t } from "../i18n";
import { color, font, fontSize, fontWeight, radius, space } from "../theme/tokens";

export const SLEEP_TILE_TEST_ID = "sleep-tile";

type Props = {
  /** `sleep` of the post as its list gave it. */
  sleep: unknown;
  /** The side of the square. */
  size: number;
};

/**
 * What the post of a night shows in a grid of drawings, where a run has
 * its line and a workout at the gym its tile (TASK-467 part E): MuW's
 * score over «Sleep», on the raised surface. A screen reader hears the
 * cell's words, not the tile's. An empty square while the sleep is off, or
 * for a night that cannot be read.
 */
export function SleepTile({ sleep, size }: Props) {
  const night = sleepPostsOn() ? sleepSummaryOf(sleep) : null;
  return (
    <View
      style={[styles.tile, { width: size, height: size }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={SLEEP_TILE_TEST_ID}
    >
      {night !== null && (
        <>
          <Text style={styles.score}>{String(night.score)}</Text>
          <Text style={styles.name}>{t("Sleep")}</Text>
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
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
  },
  score: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  name: {
    ...font.detail,
    color: color.textMuted,
  },
});
