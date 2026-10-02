import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { color, fontSize, fontWeight, space } from "../theme/tokens";

/**
 * «Feed», the page at the left of «Draw» (TASK-154): where the drawings
 * that runners publish will be (TASK-118). Until then it says so, and
 * promises nothing else.
 */
export function FeedScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.screen,
        {
          paddingTop: insets.top + space.lg,
          paddingBottom: insets.bottom + space.lg,
        },
      ]}
    >
      <Text style={styles.title}>No drawings yet</Text>
      <Text style={styles.note}>
        The drawings that runners publish will show up here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    backgroundColor: color.background,
  },
  title: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  note: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
});
