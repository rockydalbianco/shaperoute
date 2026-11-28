import type { LatLon } from "@shaperoute/shared-types";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "../i18n";
import { MapView } from "../map/MapView";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";

type Props = {
  /** Where the map opens: the point picked before, or the group's area. */
  from: LatLon;
  onDone: (point: LatLon) => void;
  onClose: () => void;
};

/**
 * The meeting point of a group outing without a route (TASK-495 part C2,
 * docs/GRUPPI.md §6), over the form: the map opens on the group's area, or
 * on the point picked before, with the pin in its middle; the fingers move
 * the map under the pin, as «Pick on map» does for the start on «Draw» (the
 * user's choice of 2026-11-28). «Done» keeps where the pin is.
 */
export function MeetingPointMap({ from, onDone, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [point, setPoint] = useState<LatLon>(from);
  return (
    <View style={[StyleSheet.absoluteFill, styles.screen]} testID="meeting-point-map">
      <View style={[styles.top, { paddingTop: insets.top + space.md }]}>
        <Text style={styles.title} accessibilityRole="header">
          {t("Meeting point")}
        </Text>
        <Text style={styles.hint}>
          {t("Move the map to put the pin on the meeting point.")}
        </Text>
      </View>
      <MapView
        start={from}
        route={null}
        picking
        onCentre={setPoint}
        // The map says itself when it cannot load, and offers «Retry».
        onError={() => {}}
        style={styles.map}
      />
      <View style={[styles.buttons, { paddingBottom: insets.bottom + space.md }]}>
        <Tap style={styles.button} onPress={onClose} accessibilityRole="button">
          <Text style={styles.buttonText}>{t("Not now")}</Text>
        </Tap>
        <Tap
          style={[styles.button, styles.primary]}
          onPress={() => onDone(point)}
          accessibilityRole="button"
          testID="meeting-point-done"
        >
          <Text style={[styles.buttonText, styles.primaryText]}>{t("Done")}</Text>
        </Tap>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.background,
  },
  top: {
    gap: space.xs,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  title: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  hint: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  map: {
    flex: 1,
  },
  buttons: {
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  button: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  primary: {
    borderColor: color.text,
    backgroundColor: color.text,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  primaryText: {
    color: color.background,
  },
});
