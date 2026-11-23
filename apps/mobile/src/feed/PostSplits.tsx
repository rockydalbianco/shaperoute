import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { color, font, fontWeight, radius, space } from "../theme/tokens";
import type { SplitRow } from "./postSections";

type Props = {
  /** The heading of the right column: "Km" or "Mile". */
  unit: string;
  rows: SplitRow[];
  /** "Fastest: km 3 · 5:12 /km", under the table; none without one. */
  fastest: string | null;
};

/**
 * The table of the splits of a post (TASK-410 part D): one line per
 * kilometre (or mile), its pace on the left, a bar as long as it was fast,
 * its number on the right; the fastest in `accent`, the part after the last
 * whole one with its length. Bars of `View`: no chart library.
 */
export function PostSplits({ unit, rows, fastest }: Props) {
  return (
    <View style={styles.table}>
      <View style={styles.head} accessible={false}>
        <Text style={styles.headText}>{t("Pace")}</Text>
        <Text style={styles.headText}>{unit}</Text>
      </View>
      {rows.map((row) => (
        <View
          key={row.label}
          style={styles.row}
          accessible
          accessibilityLabel={`${unit} ${row.label}: ${row.pace}`}
          testID={row.fastest ? "split-fastest" : undefined}
        >
          <Text style={[styles.pace, row.fastest && styles.fastest]}>{row.pace}</Text>
          <View style={styles.track}>
            <View
              style={[
                styles.bar,
                { width: `${Math.round(Math.max(0, Math.min(1, row.share)) * 100)}%` },
                row.fastest && styles.barFastest,
              ]}
              testID="split-bar"
            />
          </View>
          <Text style={[styles.number, row.partial && styles.partial]}>
            {row.label}
          </Text>
        </View>
      ))}
      {fastest !== null && <Text style={styles.note}>{fastest}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    gap: space.xs,
  },
  head: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headText: {
    ...font.detail,
    color: color.textMuted,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  pace: {
    ...font.body,
    color: color.text,
    minWidth: 80,
    fontVariant: ["tabular-nums"],
  },
  fastest: {
    color: color.accent,
    fontWeight: fontWeight.medium,
  },
  track: {
    flex: 1,
    height: 8,
  },
  bar: {
    height: 8,
    borderRadius: radius.sm,
    backgroundColor: color.textMuted,
  },
  barFastest: {
    backgroundColor: color.accent,
  },
  number: {
    ...font.body,
    color: color.textMuted,
    minWidth: 36,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  partial: {
    fontStyle: "italic",
  },
  note: {
    ...font.detail,
    color: color.textMuted,
    paddingTop: space.xs,
  },
});
