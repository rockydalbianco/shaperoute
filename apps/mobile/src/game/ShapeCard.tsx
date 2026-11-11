import type { GameMe, GameShape, GameShapeState } from "@shaperoute/shared-types";
import { StyleSheet, Text, View } from "react-native";

import { dayLabel } from "../activities/activityText";
import { t } from "../i18n";
import type { Language } from "../i18n/languages";
import { color, fontSize, fontWeight, radius, space } from "../theme/tokens";
import type { Units } from "../units/units";
import { goalText, percentText } from "./goalText";
import { ShapeOutline } from "./ShapeOutline";
import { shapeProgress } from "./shapeProgress";

type Props = {
  shape: GameShape;
  /** Every shape of the catalog: the levels of a pace, for its bar. */
  shapes: readonly GameShape[];
  /** The account's state of it; null without an account, or not yet. */
  state: GameShapeState | null;
  /** The account's totals, for how far along a locked shape is. */
  me: GameMe | null;
  width: number;
  units: Units;
  language: Language;
};

/** The outline takes this much of the card's width. */
const OUTLINE_SHARE = 0.6;
const BAR_HEIGHT = 6;

/** The name of a shape in the app's language, English without one. */
export function shapeNameIn(shape: GameShape, language: Language): string {
  return shape.names[language] || shape.names.en || shape.id;
}

/**
 * One shape of the collection (TASK-296 part B, docs/GIOCO.md §9): unlocked,
 * in the yellow with the day; locked, in grey with what it asks and how far
 * along the account is.
 */
export function ShapeCard({ shape, shapes, state, me, width, units, language }: Props) {
  const unlocked = state?.unlocked_at ?? null;
  const name = shapeNameIn(shape, language);
  const asks = goalText(shape.goal, units);
  // How far along, from the account's totals and best times (TASK-423):
  // none once unlocked, nor without an account.
  const way =
    unlocked === null && me !== null ? shapeProgress(shape, shapes, me, units) : null;
  const progress = way?.share ?? null;
  const along = way?.line ?? null;
  const label = [
    name,
    unlocked !== null ? t("Unlocked {date}", { date: dayLabel(unlocked) }) : null,
    asks,
    progress !== null ? percentText(progress) : null,
    along,
  ]
    .filter((part) => part !== null)
    .join(", ");
  return (
    <View
      style={[styles.card, { width }]}
      accessible
      accessibilityLabel={label}
      testID={`shape-card-${shape.id}`}
    >
      <ShapeOutline
        outline={shape.outline}
        size={width * OUTLINE_SHARE}
        color={unlocked !== null ? color.accent : color.textFaint}
        testID={unlocked !== null ? "shape-unlocked" : "shape-locked"}
      />
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      {unlocked !== null ? (
        <>
          <Text style={styles.when}>
            {t("Unlocked {date}", { date: dayLabel(unlocked) })}
          </Text>
          {/* What it asked, so a shape taken still says what it is worth. */}
          <Text style={styles.asks} numberOfLines={2} testID="shape-goal">
            {asks}
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.asks} numberOfLines={2}>
            {asks}
          </Text>
          {progress !== null && (
            <View style={styles.progress}>
              <View style={styles.track}>
                <View
                  style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]}
                />
              </View>
              <Text style={styles.percent}>{percentText(progress)}</Text>
            </View>
          )}
          {along !== null && (
            <Text style={styles.along} numberOfLines={2}>
              {along}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    gap: space.xs,
  },
  name: {
    marginTop: space.sm,
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  when: {
    color: color.textMuted,
    fontSize: fontSize.label,
    textAlign: "center",
  },
  asks: {
    color: color.textMuted,
    fontSize: fontSize.label,
    textAlign: "center",
  },
  progress: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginTop: space.xs,
  },
  track: {
    flex: 1,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: color.border,
    overflow: "hidden",
  },
  fill: {
    height: BAR_HEIGHT,
    backgroundColor: color.accent,
  },
  percent: {
    color: color.text,
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    minWidth: 36,
    textAlign: "right",
  },
  along: {
    color: color.textFaint,
    fontSize: fontSize.label,
    textAlign: "center",
  },
});
