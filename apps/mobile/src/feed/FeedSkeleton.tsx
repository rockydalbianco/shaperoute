import { StyleSheet, useWindowDimensions, View } from "react-native";

import { color, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { drawingHeight } from "./RouteMap";

/** How many cards stand in for the first page. */
export const SKELETON_CARDS = 2;

/**
 * The first page of «Feed» on its way (TASK-355 part B): the shape of two
 * cards, the name's circle and lines, the map and the row of actions, in
 * the surfaces of the theme. Only while the first page loads: a page asked
 * again keeps the cards it had. Nothing in it to read: a screen reader
 * hears nothing, as it heard nothing of the spinner before.
 */
export function FeedSkeleton() {
  const window = useWindowDimensions();
  const width = window.width - 2 * space.lg;
  return (
    <View
      style={styles.list}
      testID="feed-loading"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: SKELETON_CARDS }, (_, n) => (
        <View key={n} style={styles.card} testID="feed-skeleton-card">
          <View style={styles.who}>
            <View style={styles.circle} />
            <View style={styles.names}>
              <View style={[styles.line, styles.name]} />
              <View style={[styles.line, styles.place]} />
            </View>
          </View>
          <View style={[styles.map, { height: drawingHeight(width) }]} />
          <View style={styles.actions}>
            <View style={[styles.line, styles.action]} />
            <View style={[styles.line, styles.action]} />
            <View style={[styles.line, styles.action]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.md,
  },
  card: {
    gap: space.sm,
  },
  who: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  circle: {
    width: MIN_TAP_SIZE - space.sm,
    height: MIN_TAP_SIZE - space.sm,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  names: {
    flex: 1,
    gap: space.xs,
  },
  line: {
    height: 12,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceRaised,
  },
  name: {
    width: "40%",
  },
  place: {
    width: "25%",
  },
  map: {
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  actions: {
    flexDirection: "row",
    gap: space.md,
  },
  action: {
    flex: 1,
    height: 16,
  },
});
