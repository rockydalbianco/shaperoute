import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { color, font, space } from "../theme/tokens";

/** How long a piece of the dashed sample is, and the gap after it. */
const DASH = 6;
const GAP = 4;
/** The sample line's length and thickness. */
const SAMPLE_WIDTH = 34;
const SAMPLE_HEIGHT = 4;

/** The dashed sample of a lift: pieces of its colour with gaps, as on the
 * map. */
function Dashed() {
  const pieces = Math.floor((SAMPLE_WIDTH + GAP) / (DASH + GAP));
  return (
    <View style={styles.sample}>
      {Array.from({ length: pieces }, (_, at) => (
        <View
          key={at}
          style={[
            styles.dash,
            at > 0 && styles.afterGap,
            { backgroundColor: color.ski.lift },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * The legend of a day of skiing on its map (TASK-429 part B, ADR-0357):
 * the descents yellow and solid, numbered; the lifts red and dashed,
 * numbered with an L. The words say it all without the colours.
 */
export function SkiLegend() {
  return (
    <View style={styles.legend} testID="ski-legend">
      <Text style={styles.title} accessibilityRole="header">
        {t("Legend")}
      </Text>
      <View style={styles.row} accessible>
        <View style={styles.sample}>
          <View style={[styles.solid, { backgroundColor: color.ski.descent }]} />
        </View>
        <Text style={styles.words}>{t("Descents · solid, numbered")}</Text>
      </View>
      <View style={styles.row} accessible>
        <Dashed />
        <Text style={styles.words}>{t("Lifts · dashed, L1, L2…")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    gap: space.xs,
  },
  title: {
    ...font.label,
    color: color.textMuted,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  sample: {
    width: SAMPLE_WIDTH,
    height: SAMPLE_HEIGHT,
    flexDirection: "row",
  },
  solid: {
    flex: 1,
    borderRadius: SAMPLE_HEIGHT / 2,
  },
  dash: {
    width: DASH,
    height: SAMPLE_HEIGHT,
    borderRadius: SAMPLE_HEIGHT / 2,
  },
  afterGap: {
    marginLeft: GAP,
  },
  words: {
    ...font.small,
    flexShrink: 1,
    color: color.text,
  },
});
