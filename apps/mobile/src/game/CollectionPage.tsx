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
import { ProfileFrame } from "./ProfileFrame";
import { frameName } from "./prizesText";
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
      {/* Its frame, the prize of the whole collection (TASK-423 part E). */}
      <View
        style={styles.frame}
        accessible
        accessibilityLabel={`${frameName(name)}, ${
          row.complete ? t("Earned") : t("Complete the collection to earn it.")
        }`}
        testID="collection-frame"
      >
        <ProfileFrame
          collection={row.collection.id}
          outline={row.shapes.at(-1)?.outline ?? []}
          size={FRAME_SIDE}
          got={row.complete}
        />
        <View style={styles.frameText}>
          <Text style={styles.frameName}>{frameName(name)}</Text>
          <Text style={styles.frameLine}>
            {row.complete ? t("Earned") : t("Complete the collection to earn it.")}
          </Text>
        </View>
      </View>
    </View>
  );
}

const FRAME_SIDE = 56;

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
  frame: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  frameText: {
    flex: 1,
    gap: 2,
  },
  frameName: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  frameLine: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
  },
});
