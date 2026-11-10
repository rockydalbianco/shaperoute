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
import { arrowTurnDeg, isTurned } from "./turnedMap";

type Props = {
  /** The map's bearing now, in degrees clockwise from north. */
  shown: number;
  onPress: () => void;
  /** Whether north is up, for the hint, when the map says it better than
   * `shown` does: on the run's «Compass» page (TASK-422). */
  northUp?: boolean;
  /** What a tap does with north up, when not the drawing's turn. */
  upHint?: string;
};

/**
 * The north arrow of a turned map (TASK-232, ADR-0195): it points where
 * north is. A tap puts north up; with north up, a tap turns the map as the
 * drawing again, or where the phone points on the run's «Compass» page
 * (TASK-422).
 */
export function NorthArrow({ shown, onPress, northUp, upHint }: Props) {
  const up = northUp ?? !isTurned(shown);
  return (
    <Pressable
      testID="north-arrow"
      style={styles.button}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("North arrow")}
      accessibilityHint={
        up
          ? (upHint ?? t("Turns the map like the drawing"))
          : t("Turns the map north up")
      }
    >
      <View
        testID="north-arrow-needle"
        style={[
          styles.needle,
          { transform: [{ rotate: `${arrowTurnDeg(shown)}deg` }] },
        ]}
      >
        <Text style={styles.tip}>▲</Text>
        <Text style={styles.north}>N</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // As the way back, on the other side of the map.
  button: {
    alignSelf: "flex-end",
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  needle: {
    alignItems: "center",
    paddingBottom: space.xs / 2,
  },
  // The tip in red (TASK-431): north at a glance, as on a compass.
  tip: {
    color: color.north,
    fontSize: fontSize.label,
    lineHeight: fontSize.label,
  },
  north: {
    color: color.text,
    fontSize: fontSize.detail,
    lineHeight: fontSize.detail + 2,
    fontWeight: fontWeight.bold,
  },
});
