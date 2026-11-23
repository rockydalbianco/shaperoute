import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { fontWeight, type Palette } from "../theme/tokens";
import type { Units } from "../units/units";
import type { Near } from "./airspaceNear";
import { FL_LINE, nearLine } from "./airspaceText";
import type { AltitudeUnit } from "./flightUnits";

/**
 * The airspace warning on the flight screen (TASK-479 part E2): a line over
 * the pages while a volume of the pilot's file is within the warning,
 * with «≈» explained when a flight level is in the reckoning. Only words
 * of distance: never «free».
 */
export function AirspaceAlertLine({
  alert,
  units,
  altitudeUnit,
  palette,
}: {
  alert: Near | null;
  units: Units;
  altitudeUnit: AltitudeUnit;
  palette: Palette;
}) {
  if (alert === null) {
    return null;
  }
  return (
    <View
      style={[
        styles.line,
        { borderColor: palette.warning, backgroundColor: palette.surface },
      ]}
      testID="airspace-alert"
      accessibilityRole="alert"
    >
      <Text style={[styles.text, { color: palette.text }]} numberOfLines={2}>
        {nearLine(alert, units, altitudeUnit)}
      </Text>
      {alert.approx ? (
        <Text style={[styles.small, { color: palette.textMuted }]}>{t(FL_LINE)}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    marginHorizontal: 6,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 3,
    borderRadius: 14,
    gap: 2,
  },
  text: { fontSize: 18, fontWeight: fontWeight.bold },
  small: { fontSize: 13 },
});
