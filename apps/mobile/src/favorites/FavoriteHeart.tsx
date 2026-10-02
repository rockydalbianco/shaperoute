import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { color, fontSize, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import type { Keepable } from "./favoriteRoute";
import { useFavoritesDoor } from "./favoritesDoor";

/** A heart as text, not as an emoji: the app has no icons. */
export const HEART_KEPT = "♥︎";
export const HEART_EMPTY = "♡";

type Props = {
  /** The route on the map; null while there is none to keep. */
  route: Keepable | null;
};

/**
 * The heart over the map, opposite the way back (TASK-171): keeps the route
 * shown among the favorites of the account, or removes it. Full when kept.
 */
export function FavoriteHeart({ route }: Props) {
  const insets = useSafeAreaInsets();
  const favorites = useFavoritesDoor();
  if (route === null) {
    return null;
  }
  const kept = favorites.has(route.id);
  return (
    <View
      style={[styles.corner, { top: insets.top + space.sm }]}
      pointerEvents="box-none"
    >
      <Pressable
        style={styles.button}
        onPress={() => favorites.press(route)}
        accessibilityRole="button"
        accessibilityLabel={kept ? "Remove from favorites" : "Add to favorites"}
        accessibilityState={{ selected: kept }}
      >
        <Text style={styles.heart}>{kept ? HEART_KEPT : HEART_EMPTY}</Text>
      </Pressable>
      {favorites.problem !== null && (
        <Pressable
          style={styles.problem}
          onPress={favorites.clearProblem}
          accessibilityRole="alert"
        >
          <Text style={styles.problemText}>{favorites.problem}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  corner: {
    position: "absolute",
    right: space.lg,
    alignItems: "flex-end",
    gap: space.sm,
  },
  // As the way back on the other side: neutral, the yellow is the route's.
  button: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  heart: {
    color: color.text,
    fontSize: fontSize.title,
  },
  problem: {
    maxWidth: 260,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
  },
  problemText: {
    color: color.error,
    fontSize: fontSize.small,
  },
});
