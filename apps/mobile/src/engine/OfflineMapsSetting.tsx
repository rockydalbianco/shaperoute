import { useEffect, useState } from "react";
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
import { sizeText } from "./sizeText";
import { deleteZones, savedBytes, watchZones } from "./zones";

/**
 * «Offline maps» in «Settings» (TASK-214, part C): the space the zones of
 * the engine on the phone take, with «Delete», and under it how they
 * download. The texts are the user's choice of 2026-10-03. The size follows
 * the zones while the page is open; after «Delete» the phone downloads its
 * maps again at the next opening, as after the install.
 */
export function OfflineMapsSetting() {
  const [bytes, setBytes] = useState(() => savedBytes());
  useEffect(() => watchZones(() => setBytes(savedBytes())), []);
  return (
    <View style={styles.setting}>
      <View style={styles.menu}>
        <View style={styles.row}>
          <Text style={styles.emoji}>🗺️</Text>
          <Text style={styles.rowText}>
            {t("Offline maps: {size}", { size: sizeText(bytes) })}
          </Text>
          {bytes > 0 && (
            <Pressable
              style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
              onPress={deleteZones}
              accessibilityRole="button"
            >
              <Text style={styles.deleteText}>{t("Delete")}</Text>
            </Pressable>
          )}
        </View>
      </View>
      <Text style={styles.note}>{t("Maps download on Wi-Fi and mobile data.")}</Text>
    </View>
  );
}

// The rows of «Settings» (`../profile/SettingsPage`), so the row sits among
// the others as one of them.
const styles = StyleSheet.create({
  setting: {
    gap: space.sm,
  },
  menu: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  row: {
    minHeight: MIN_TAP_SIZE + space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.md,
  },
  emoji: {
    fontSize: fontSize.input + space.xs,
  },
  rowText: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.medium,
  },
  // Neutral: the yellow belongs to the route (docs/UI.md, «Il tema»).
  delete: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.sm,
  },
  deleteText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  pressed: {
    opacity: 0.6,
  },
  note: {
    paddingHorizontal: space.md,
    color: color.textMuted,
    fontSize: fontSize.small,
  },
});
