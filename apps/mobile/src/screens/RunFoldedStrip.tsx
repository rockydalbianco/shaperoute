import { Pressable, StyleSheet, View } from "react-native";

import { t } from "../i18n";
import { color, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { type RunNumbers, RunStrip } from "./RunPanel";

/**
 * The card under the map of «Map», folded (TASK-472): dragged down, it
 * leaves only a strip, how far, the pace now and the time on one line,
 * and «Pause» beside them, so the map takes the rest of the screen. Dragged
 * up, or touched, it opens again. Paused, the card is always open: «Stop»
 * and «Resume» are in it.
 */

/** A finger that moved this far up or down, and less sideways, folds or
 * opens the card. */
export const FOLD_M = 32;

/**
 * Whether a drag of (`dx`, `dy`) leaves the card folded: down folds it, up
 * opens it; a drag too short, or more sideways than up or down, leaves it
 * as it was, `folded`.
 */
export function foldedAfter(dx: number, dy: number, folded: boolean): boolean {
  if (Math.abs(dy) < FOLD_M || Math.abs(dy) < 2 * Math.abs(dx)) {
    return folded;
  }
  return dy > 0;
}

/** Whether a drag has gone up or down enough to be the card's. */
export function upOrDown(dx: number, dy: number): boolean {
  return Math.abs(dy) > 16 && Math.abs(dy) > 2 * Math.abs(dx);
}

/** The small bar at the top of the card that says it can be dragged; touched,
 * it folds the card or opens it. */
export function FoldHandle({
  folded,
  onPress,
}: {
  folded: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.handleBox}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={folded ? t("Show the numbers") : t("Hide the numbers")}
      testID="run-fold-handle"
    >
      <View style={styles.handle} />
    </Pressable>
  );
}

/** The folded card: the strip of numbers and «Pause». */
export function RunFoldedStrip({
  numbers,
  onOpen,
  onPause,
}: {
  numbers: RunNumbers;
  onOpen: () => void;
  onPause: () => void;
}) {
  return (
    <View testID="run-folded">
      <FoldHandle folded onPress={onOpen} />
      <View style={styles.row}>
        <Pressable
          style={styles.numbers}
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={t("Show the numbers")}
        >
          <RunStrip numbers={numbers} />
        </Pressable>
        <Pressable
          style={styles.pause}
          onPress={onPause}
          accessibilityRole="button"
          accessibilityLabel={t("Pause")}
          testID="run-folded-pause"
        >
          <View style={styles.bars}>
            <View style={styles.bar} />
            <View style={styles.bar} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // A tap's height, the bar drawn small in its middle.
  handleBox: {
    alignSelf: "center",
    width: MIN_TAP_SIZE * 2,
    height: MIN_TAP_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -space.md,
  },
  handle: {
    width: space.xl * 2,
    height: space.xs,
    borderRadius: radius.pill,
    backgroundColor: color.borderStrong,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  numbers: {
    flex: 1,
  },
  // Light, not yellow, as the large «Pause»: pausing does not make the route.
  pause: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.text,
  },
  bars: {
    flexDirection: "row",
    gap: space.xs,
  },
  bar: {
    width: space.xs,
    height: space.lg,
    borderRadius: 1,
    backgroundColor: color.background,
  },
});
