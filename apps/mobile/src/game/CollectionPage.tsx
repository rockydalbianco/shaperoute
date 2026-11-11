import type { GameMe, GameShape, GameShapeState } from "@shaperoute/shared-types";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import type { Language } from "../i18n/languages";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import type { Units } from "../units/units";
import { type CollectionRow, collectionNameIn, countText } from "./collections";
import { ShapeCard } from "./ShapeCard";

type Props = {
  row: CollectionRow;
  /** Every shape of the catalog: the levels of a pace, for its bar. */
  shapes: readonly GameShape[];
  /** The account's state of each shape, by id; empty without an account. */
  states: ReadonlyMap<string, GameShapeState>;
  me: GameMe | null;
  /** The width of one card of the grid. */
  cardWidth: number;
  units: Units;
  language: Language;
  /** «←»: back to the collections. */
  onBack: () => void;
};

/**
 * The page of one collection (TASK-423 part D, docs/GIOCO.md §9): its name
 * and «7 / 13», then its shapes in the grid of «Play», easiest first.
 */
export function CollectionPage({
  row,
  shapes,
  states,
  me,
  cardWidth,
  units,
  language,
  onBack,
}: Props) {
  const name = collectionNameIn(row.collection, language);
  return (
    <View style={styles.page} testID={`collection-page-${row.collection.id}`}>
      <View style={styles.header}>
        <Pressable
          style={styles.back}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t("Back")}
          testID="collection-back"
        >
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.name} accessibilityRole="header" numberOfLines={1}>
          {name}
        </Text>
        <Text
          style={styles.count}
          accessibilityLabel={t("{unlocked} of {total} shapes", {
            unlocked: row.unlocked,
            total: row.total,
          })}
          testID="collection-count"
        >
          {countText(row)}
        </Text>
      </View>
      <View style={styles.grid}>
        {row.shapes.map((shape) => (
          <ShapeCard
            key={shape.id}
            shape={shape}
            shapes={shapes}
            state={states.get(shape.id) ?? null}
            me={me}
            width={cardWidth}
            units={units}
            language={language}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: space.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  back: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  backText: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
  },
  name: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  count: {
    color: color.textMuted,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
  },
});
