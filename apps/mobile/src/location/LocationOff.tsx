import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { color, fontSize, fontWeight, space } from "../theme/tokens";
import { OpenSettings } from "../permissions/OpenSettings";

/** What the position was wanted for: following a route, or recording. */
export type LocationUse = "navigate" | "record";

/**
 * The position is refused, or the phone's location services are off
 * (TASK-253 treats both alike): the run's screens say so and offer the
 * Settings (TASK-259), in place of a run that would wait for a fix forever.
 */
export function LocationOff({ use }: { use: LocationUse }) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>{t("Location is off")}</Text>
      <Text style={styles.text}>
        {use === "navigate"
          ? t("Allow it for MuW in Settings to follow the route.")
          : t("Allow it for MuW in Settings to record your track.")}
      </Text>
      <OpenSettings />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: space.xs,
  },
  title: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  // As the banner's other lines (NavigateScreen, FreeRunScreen).
  text: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
});
