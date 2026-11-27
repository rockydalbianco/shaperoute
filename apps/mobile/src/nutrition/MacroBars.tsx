import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { t, tLater } from "../i18n";
import { color, font, radius, space } from "../theme/tokens";
import { springTo } from "../ui/motion";
import { useReduceMotion } from "../ui/useReduceMotion";
import { type Macros, macroShares } from "./intake";

// In English; shown with t() in the app's language.
const NAMES = {
  protein: tLater("Protein"),
  carbs: tLater("Carbs"),
  fat: tLater("Fat"),
} as const;

type Kind = keyof typeof NAMES;
const KINDS: readonly Kind[] = ["protein", "carbs", "fat"];

type Props = {
  /** What the day's foods add up to; null when none has the numbers. */
  macros: Macros | null;
};

/**
 * Protein, carbohydrates and fat of a day (TASK-489 part H): the grams of
 * each, and a bar as long as its share of the energy the three give. No
 * target and no colour of judgement: MuW does not say how much of each one
 * should eat. Each bar has the colour of its kind, the same as the rings of
 * a recipe (TASK-489 part L, «Sì, stessi colori»); the name and the number
 * stay beside it, so the colour is never the only sign. Foods written with
 * their calories alone have none of the three, and the card says when one
 * was left out.
 */
export function MacroBars({ macros }: Props) {
  const shares = macros === null ? null : macroShares(macros);
  const grams =
    macros === null
      ? null
      : { protein: macros.proteinG, carbs: macros.carbsG, fat: macros.fatG };
  return (
    <View style={styles.card} testID="diary-macros">
      <Text style={styles.title} accessibilityRole="header">
        {t("Protein, carbs and fat (est.)")}
      </Text>
      {grams === null || shares === null ? (
        <Text style={styles.note} testID="diary-macros-none">
          {t("No protein, carbs or fat to count for this day.")}
        </Text>
      ) : (
        <>
          {KINDS.map((kind) => {
            const amount = `${grams[kind]} g · ${t("{percent}% of the energy", {
              percent: String(shares[kind]),
            })}`;
            return (
              <View
                key={kind}
                style={styles.row}
                accessible
                accessibilityLabel={`${t(NAMES[kind])}, ${amount}`}
                testID={`diary-macro-${kind}`}
              >
                <View style={styles.line}>
                  <Text style={styles.name}>{t(NAMES[kind])}</Text>
                  <Text style={styles.amount}>{amount}</Text>
                </View>
                <Bar
                  share={shares[kind] / 100}
                  fill={color[kind]}
                  testID={`diary-macro-${kind}-bar`}
                />
              </View>
            );
          })}
          {!macros?.complete && (
            <Text style={styles.note} testID="diary-macros-partial">
              {t("Counted only for the foods that have these numbers.")}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

/** A bar in `fill` that grows from the left to `share` of its track. */
function Bar({ share, fill, testID }: { share: number; fill: string; testID: string }) {
  const still = useReduceMotion();
  const [at] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (still) {
      at.setValue(share);
      return;
    }
    const going = springTo(at, share, "smooth");
    going.start();
    return () => going.stop();
  }, [at, share, still]);
  return (
    <View
      style={styles.track}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Animated.View
        testID={testID}
        style={[styles.fill, { backgroundColor: fill, transform: [{ scaleX: at }] }]}
      />
    </View>
  );
}

const BAR = space.sm;

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  title: {
    ...font.small,
    color: color.textMuted,
  },
  row: {
    gap: space.xs,
  },
  line: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: space.sm,
  },
  name: {
    ...font.body,
    color: color.text,
  },
  amount: {
    ...font.small,
    flexShrink: 1,
    color: color.textMuted,
  },
  track: {
    height: BAR,
    borderRadius: BAR / 2,
    backgroundColor: color.border,
    overflow: "hidden",
  },
  // Its colour is its kind's: none is the good one.
  fill: {
    height: BAR,
    borderRadius: BAR / 2,
    transformOrigin: "left center",
  },
  note: {
    ...font.small,
    color: color.textMuted,
  },
});
