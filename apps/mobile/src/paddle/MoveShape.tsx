import { Pressable, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";

/**
 * Under the map while the user moves the shape of a route on the water
 * (TASK-238): what to do, and the way out. The drag itself is the map's.
 */
export function MoveShape({ onCancel }: { onCancel: () => void }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{t("Move the shape")}</Text>
      <Text style={styles.text}>
        {t("Drag the shape where you want it, then let go.")}
      </Text>
      <Text style={styles.note}>
        {t("It stays on the water, off the shore, where it fits.")}
      </Text>
      <Pressable style={styles.cancel} onPress={onCancel} accessibilityRole="button">
        <Text style={styles.cancelText}>{t("Cancel")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: space.sm,
  },
  title: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  text: {
    color: color.text,
    fontSize: fontSize.body,
  },
  note: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  cancel: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  cancelText: {
    color: color.text,
    fontWeight: fontWeight.bold,
  },
});
