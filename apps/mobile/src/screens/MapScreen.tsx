import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { color, fontSize, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { MapError } from "./ChooseScreen";

type Props = {
  /** The map itself: mounted by the app for both screens, so it never reloads. */
  map: ReactNode;
  /** True on the second screen: the controls over and under the map show. */
  active: boolean;
  onBack: () => void;
  mapError: string | null;
  /** While navigating, the next turn, in place of the way back (TASK-049). */
  banner?: ReactNode;
  /** The wait, the route or the problem (RouteOutcome). */
  children: ReactNode;
};

/**
 * The second screen (TASK-051): the map, edge to edge, with a way back and a
 * card underneath. The card sits below the map, not over it, so it never
 * covers the attribution (UI.md).
 */
export function MapScreen({ map, active, onBack, mapError, banner, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <View style={styles.map}>
        {map}
        {active && (
          <View style={[styles.top, { top: insets.top + space.sm }]}>
            {banner ?? (
              <Pressable
                style={styles.back}
                onPress={onBack}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <Text style={styles.backText}>←</Text>
              </Pressable>
            )}
            {mapError && !banner && (
              <View style={styles.errorBox}>
                <MapError reason={mapError} />
              </View>
            )}
          </View>
        )}
      </View>
      {active && (
        <View style={[styles.card, { paddingBottom: insets.bottom + space.md }]}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.map.background,
  },
  map: {
    flex: 1,
  },
  top: {
    position: "absolute",
    left: space.lg,
    right: space.lg,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm,
  },
  back: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  backText: {
    color: color.text,
    fontSize: fontSize.title,
  },
  errorBox: {
    flex: 1,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
  },
  card: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: color.surface,
  },
});
