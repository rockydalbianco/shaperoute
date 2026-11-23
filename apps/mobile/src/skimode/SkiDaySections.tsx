import { Pressable, StyleSheet, Text, View } from "react-native";

import { t, tLater } from "../i18n";
import { color, font, fontWeight, MIN_TAP_SIZE, radius, space } from "../theme/tokens";

/** The sections of a day of skiing: its numbers, its map, its parts. */
export type SkiDaySection = "summary" | "map" | "runs";

/** In English: shown with `t()`. The sections, in their order. */
const SECTIONS: readonly { key: SkiDaySection; label: string }[] = [
  { key: "summary", label: tLater("Summary") },
  { key: "map", label: tLater("Map") },
  { key: "runs", label: tLater("Runs@@ski") },
];

type Props = {
  section: SkiDaySection;
  onSection: (section: SkiDaySection) => void;
};

/**
 * «Summary · Map · Runs» on a day of skiing (TASK-429 part B, ADR-0357): a
 * row of three, the one on screen raised. «Map» leaves the map to itself.
 */
export function SkiDaySections({ section, onSection }: Props) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {SECTIONS.map(({ key, label }) => {
        const on = key === section;
        return (
          <Pressable
            key={key}
            style={[styles.tab, on && styles.on]}
            onPress={() => onSection(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            testID={`ski-day-${key}`}
          >
            <Text style={[styles.text, on && styles.textOn]}>{t(label)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: space.xs,
    padding: space.xs,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  tab: {
    flex: 1,
    minHeight: MIN_TAP_SIZE - space.xs,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  on: {
    backgroundColor: color.background,
  },
  text: {
    ...font.small,
    fontWeight: fontWeight.semibold,
    color: color.textMuted,
  },
  textOn: {
    color: color.text,
  },
});
