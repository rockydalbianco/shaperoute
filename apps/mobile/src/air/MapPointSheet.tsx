import type { LatLon } from "@shaperoute/shared-types";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { t, tLater } from "../i18n";
import { fontWeight, type Palette } from "../theme/tokens";

/**
 * What a long press on the flight map offers (TASK-479 part D5): a
 * waypoint there, a landing there, or nothing. Big targets, three of them:
 * it is touched in the air.
 */

export const POINT_TITLE = tLater("Mark this place");
export const WAYPOINT_HERE = tLater("Waypoint here");
export const LANDING_HERE = tLater("Landing here");

export function MapPointSheet({
  point,
  palette,
  onWaypoint,
  onLanding,
  onClose,
}: {
  /** Where the map was pressed; null with the sheet closed. */
  point: LatLon | null;
  palette: Palette;
  onWaypoint: (point: LatLon) => void;
  onLanding: (point: LatLon) => void;
  onClose: () => void;
}) {
  const button = (label: string, onPress: () => void, testID: string, main = false) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={testID}
      style={[
        styles.button,
        {
          backgroundColor: main ? palette.accent : palette.surfaceRaised,
          borderColor: main ? palette.accent : palette.borderStrong,
        },
      ]}
    >
      <Text
        style={[styles.buttonText, { color: main ? palette.onAccent : palette.text }]}
      >
        {label}
      </Text>
    </Pressable>
  );
  return (
    <Modal
      visible={point !== null}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={[styles.dim, { backgroundColor: palette.scrim }]}
          onPress={onClose}
          accessibilityLabel={t("Close")}
        />
        <View
          style={[styles.sheet, { backgroundColor: palette.surface }]}
          testID="map-point-sheet"
        >
          <Text style={[styles.title, { color: palette.text }]}>{t(POINT_TITLE)}</Text>
          {point !== null ? (
            <Text style={{ color: palette.textMuted }}>
              {`${point[0].toFixed(5)}, ${point[1].toFixed(5)}`}
            </Text>
          ) : null}
          {button(
            t(WAYPOINT_HERE),
            () => point && onWaypoint(point),
            "map-point-waypoint",
            true,
          )}
          {button(
            t(LANDING_HERE),
            () => point && onLanding(point),
            "map-point-landing",
          )}
          {button(t("Cancel"), onClose, "map-point-cancel")}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  dim: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, opacity: 0.6 },
  sheet: {
    gap: 12,
    padding: 24,
    paddingBottom: 40,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  title: { fontSize: 20, fontWeight: fontWeight.bold },
  button: {
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 18, fontWeight: fontWeight.semibold },
});
