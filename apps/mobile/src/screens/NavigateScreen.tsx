import { Pressable, StyleSheet, Text, View } from "react-native";

import { type Navigation, remainingM, upcoming } from "../navigation/navigator";
import { ARROWS, distanceLabel, instruction, thenText } from "../navigation/phrases";
import type { NavigationState } from "../navigation/useNavigation";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";

/**
 * Navigation over the map (TASK-049): the next turn at the top, big enough
 * to read while running, and the way out at the bottom. Voice and vibration
 * say the same (useNavigation).
 */
export function NavigationBanner({ state }: { state: NavigationState }) {
  if (state.status === "denied") {
    return (
      <View style={styles.banner}>
        <Text style={styles.message}>
          Location is off for ShapeRoute: allow it in Settings to navigate.
        </Text>
      </View>
    );
  }
  if (state.status === "starting") {
    return (
      <View style={styles.banner}>
        <Text style={styles.message}>Finding your position…</Text>
      </View>
    );
  }
  const { navigation } = state;
  if (navigation.arrived) {
    return (
      <View style={styles.banner}>
        <Text style={styles.instruction}>You have arrived.</Text>
      </View>
    );
  }
  if (navigation.offRoute) {
    return (
      <View style={[styles.banner, styles.off]}>
        <Text style={styles.instruction}>Off the route</Text>
        <Text style={styles.message}>Head back to the yellow line.</Text>
      </View>
    );
  }
  const next = upcoming(navigation);
  if (next === null) {
    return (
      <View style={styles.banner}>
        <Text style={styles.instruction}>Follow the route to the end.</Text>
      </View>
    );
  }
  return (
    <View style={styles.banner} accessibilityLiveRegion="polite">
      <View style={styles.row}>
        <Text style={styles.arrow} accessibilityElementsHidden>
          {ARROWS[next.direction.turn]}
        </Text>
        <View style={styles.words}>
          <Text style={styles.distance}>{distanceLabel(next.inM)}</Text>
          <Text style={styles.instruction}>{instruction(next.direction)}</Text>
        </View>
      </View>
      {next.then.length > 0 && (
        <Text style={styles.message}>{thenText(next.then)}</Text>
      )}
    </View>
  );
}

export function NavigationCard({
  navigation,
  onStop,
}: {
  navigation: Navigation | null;
  onStop: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.left}>
        {navigation ? `${distanceLabel(remainingM(navigation))} to go` : " "}
      </Text>
      <Pressable style={styles.stop} onPress={onStop} accessibilityRole="button">
        <Text style={styles.stopText}>Stop</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flex: 1,
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  off: {
    borderColor: color.warning,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  arrow: {
    color: color.accent,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
  },
  words: {
    flex: 1,
  },
  distance: {
    color: color.accent,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  instruction: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  message: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  left: {
    color: color.text,
    fontSize: fontSize.body,
  },
  stop: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  stopText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
