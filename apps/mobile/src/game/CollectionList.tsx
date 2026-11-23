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
import { Tap } from "../ui/Tap";
import { type CollectionRow, collectionNameIn, countText } from "./collections";
import { ShapeOutline } from "./ShapeOutline";

type Props = {
  rows: CollectionRow[];
  language: Language;
  /** A collection touched: its page. */
  onOpen: (id: string) => void;
};

const OUTLINE_SIDE = 48;
const BAR_HEIGHT = 6;

/**
 * «Collection» in collections (TASK-423 part D, docs/GIOCO.md §9): one row
 * for each, with the outline of the first shape not taken yet (in yellow
 * once all are), its name, «7 / 13» and the bar; a row touched opens its
 * page.
 */
export function CollectionList({ rows, language, onOpen }: Props) {
  return (
    <View style={styles.list} testID="collection-list">
      {rows.map((row) => {
        const name = collectionNameIn(row.collection, language);
        const share = row.total > 0 ? row.unlocked / row.total : 0;
        return (
          <Tap
            key={row.collection.id}
            style={styles.row}
            onPress={() => onOpen(row.collection.id)}
            accessibilityRole="button"
            accessibilityLabel={t("{name}, {unlocked} of {total} shapes", {
              name,
              unlocked: row.unlocked,
              total: row.total,
            })}
            testID={`collection-${row.collection.id}`}
          >
            <ShapeOutline
              outline={row.shown.outline}
              size={OUTLINE_SIDE}
              color={row.complete ? color.accent : color.textFaint}
              thickness={2}
            />
            <View style={styles.body}>
              <View style={styles.line}>
                <Text style={styles.name} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={styles.count}>{countText(row)}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round(share * 100)}%` }]} />
              </View>
            </View>
          </Tap>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    minHeight: MIN_TAP_SIZE,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  body: {
    flex: 1,
    gap: space.sm,
  },
  line: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.sm,
  },
  name: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  count: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
  },
  track: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: color.border,
    overflow: "hidden",
  },
  fill: {
    height: BAR_HEIGHT,
    backgroundColor: color.accent,
  },
});
