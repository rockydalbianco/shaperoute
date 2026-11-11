import { Pressable, StyleSheet, Text } from "react-native";

import { t } from "../i18n";
import { color, fontWeight, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import type { Keepable } from "./favoriteRoute";
import { useFavoritesDoor } from "./favoritesDoor";

type Props = {
  /** The route on screen, as the heart keeps it. */
  route: Keepable;
};

/**
 * «Save» beside «Start» under a route drawn from an edit: «Edit & run» of
 * a post, «Edit the drawing» of «Explore». It keeps the route among the
 * favorites, as the heart over the map does, and says «Saved» once kept; a
 * second press lets it go, as the heart. With nobody signed in, «Profile»
 * first, as the heart.
 */
export function SaveRouteButton({ route }: Props) {
  const favorites = useFavoritesDoor();
  const kept = favorites.has(route.id);
  return (
    <Pressable
      style={styles.button}
      onPress={() => favorites.press(route)}
      accessibilityRole="button"
      accessibilityLabel={t(kept ? "Saved" : "Save")}
      accessibilityState={{ selected: kept }}
    >
      <Text style={styles.text}>{t(kept ? "Saved" : "Save")}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // As tall as «Start» beside it; neutral, the yellow is «Start»'s.
  button: {
    flex: 1,
    minHeight: MIN_TAP_SIZE + space.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  text: {
    color: color.text,
    fontWeight: fontWeight.bold,
  },
});
