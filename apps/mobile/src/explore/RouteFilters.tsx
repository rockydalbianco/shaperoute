import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { color, fontSize, MIN_TAP_SIZE, radius, space } from "../theme/tokens";

/** The choice that keeps every route (ExploreScreen, `filterOptions`). */
export const ALL = "all";

type Filter = {
  /** What it filters by, as its button says: "Shape", "Distance". */
  name: string;
  /** "all" first, then what the list has. */
  options: string[];
  value: string;
  onChange: (value: string) => void;
};

type Props = {
  filters: Filter[];
};

function capitalised(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A choice as it is read: "All", "Heart", "5 km". */
export function optionLabel(option: string): string {
  return option === ALL ? "All" : capitalised(option);
}

/**
 * The filters of «Best near you» in one row (TASK-167, ADR-0135): a button
 * each, which says what it keeps. Touching one opens its choices under the
 * row; a choice closes them again. One filter is open at a time.
 */
export function RouteFilters({ filters }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const opened = filters.find((filter) => filter.name === open) ?? null;
  return (
    <View style={styles.filters}>
      <View style={styles.row}>
        {filters.map((filter) => {
          const expanded = filter.name === open;
          const chosen = filter.value !== ALL;
          return (
            <Pressable
              key={filter.name}
              style={[styles.chip, (chosen || expanded) && styles.chipOn]}
              onPress={() => setOpen(expanded ? null : filter.name)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${filter.name}: ${optionLabel(filter.value)}`}
            >
              <Text
                style={[styles.chipText, (chosen || expanded) && styles.chipTextOn]}
                numberOfLines={1}
              >
                {`${filter.name}: ${optionLabel(filter.value)} ${expanded ? "▴" : "▾"}`}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {opened !== null && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.row}>
            {opened.options.map((option) => {
              const selected = option === opened.value;
              return (
                <Pressable
                  key={option}
                  style={[styles.option, selected && styles.optionOn]}
                  onPress={() => {
                    opened.onChange(option);
                    setOpen(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextOn]}>
                    {optionLabel(option)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filters: {
    gap: space.sm,
  },
  row: {
    flexDirection: "row",
    gap: space.sm,
  },
  // Each takes half the row: two filters, one line.
  chip: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  // A filter that keeps something, or is open, is told by the light border,
  // not by yellow: that is the route's.
  chipOn: {
    borderColor: color.text,
  },
  chipText: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  chipTextOn: {
    color: color.text,
  },
  option: {
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    justifyContent: "center",
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  optionOn: {
    backgroundColor: color.surfaceRaised,
    borderColor: color.text,
  },
});
