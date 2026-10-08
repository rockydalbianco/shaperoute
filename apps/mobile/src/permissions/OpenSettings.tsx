import { Linking, Pressable, StyleSheet, Text } from "react-native";

import { t } from "../i18n";
import { color, fontWeight, MIN_TAP_SIZE } from "../theme/tokens";

/**
 * «Open Settings» beside a text that says the phone refused something the
 * app needs, the camera or the position (TASK-259): the app's own page of
 * the phone's settings, where it can be allowed. An underlined link, not a
 * yellow button: yellow is the route's.
 */
export function OpenSettings() {
  return (
    <Pressable
      style={styles.button}
      onPress={() => void Linking.openSettings()}
      accessibilityRole="button"
    >
      <Text style={styles.text}>{t("Open Settings")}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  text: {
    color: color.text,
    fontWeight: fontWeight.bold,
    textDecorationLine: "underline",
  },
});
