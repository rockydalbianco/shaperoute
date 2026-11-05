import { Pressable, StyleSheet, Text } from "react-native";

import { t } from "../i18n";
import { color, fontWeight, MIN_TAP_SIZE, radius, space } from "../theme/tokens";

/**
 * «Edit the drawing» under the routes A, B and C of «Draw» (TASK-403,
 * ADR-0337, back after TASK-340): it puts the line of the route chosen on
 * the map of «Draw on the map», where it is, to draw on. Without `onPress`
 * there is none.
 */
export function EditDrawingButton({ onPress }: { onPress?: () => void }) {
  // No line that makes a drawing: no button.
  if (onPress === undefined) {
    return null;
  }
  return (
    <Pressable style={styles.button} onPress={onPress} accessibilityRole="button">
      <Text style={styles.buttonText}>{t("Edit the drawing")}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  buttonText: {
    color: color.text,
    fontWeight: fontWeight.bold,
  },
});
