import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { t } from "../i18n";
import { climbM } from "../navigation/runMetrics";
import { openPause, type Track } from "../navigation/trackRecorder";
import { NO_NUMBER, Tile, TICK_MS, useNow } from "../screens/RunPanel";
import { color, radius, space } from "../theme/tokens";
import { flightNow } from "./flight";

/**
 * A flight as it goes (TASK-305 part R2, ADR-0375), over the numbers of the
 * recording: the altitude, the vario (+ climbing, − sinking), the highest
 * altitude so far and the metres climbed. The time, the distance and the
 * speed are the recording's, under it. In metres, as the ski tour's height;
 * two to a row, as the ski tour's: «Max altitude» is cut short three
 * abreast.
 */

/** "+1.2", "-0.8", "0.0". */
export function varioText(mps: number | null): string {
  if (mps === null) {
    return NO_NUMBER;
  }
  const tenths = Math.round(mps * 10);
  const text = (Math.abs(tenths) / 10).toFixed(1);
  return tenths > 0 ? `+${text}` : tenths < 0 ? `-${text}` : text;
}

function metresText(metres: number | null): string {
  return metres === null ? NO_NUMBER : String(Math.round(metres));
}

export function FlightLive({ track, live }: { track: Track; live: boolean }) {
  const paused = openPause(track) !== null;
  // The vario goes quiet when the fixes stop: the clock ticks to tell.
  const now = useNow(live && !paused, TICK_MS);
  const at = live ? now : (track.fixes[track.fixes.length - 1]?.timeMs ?? 0);
  const flight = flightNow(track, at);
  // Once per fix, not once per second.
  const climbed = useMemo(() => climbM(track), [track]);
  return (
    <View style={styles.box} testID="flight-live">
      <View style={styles.row}>
        <Tile label={t("Altitude")} value={metresText(flight.altM)} unit="m" />
        <Tile label={t("Vario")} value={varioText(flight.varioMps)} unit="m/s" />
      </View>
      <View style={styles.row}>
        <Tile label={t("Max altitude")} value={metresText(flight.maxAltM)} unit="m" />
        <Tile label={t("Elev. gain")} value={metresText(climbed)} unit="m" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  row: {
    flexDirection: "row",
    gap: space.sm,
  },
});
