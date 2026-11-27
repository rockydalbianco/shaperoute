import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { t, tLater } from "../i18n";
import { useCurrentPosition } from "../location/useCurrentPosition";
import { color, fontSize, fontWeight, space } from "../theme/tokens";
import type { Units } from "../units/units";
import { useUnits } from "../units/useUnits";
import { clockText } from "./flightUnits";
import { refreshWinds, useWinds } from "./windStore";

/**
 * The wind aloft in «Ready to fly» (TASK-479 part H, ADR-0388): for the
 * next hours, at four pressure levels, where it comes from and how strong,
 * from the model's run the card names, with its credit. Numbers and
 * arrows only: never «flyable», «good» or «safe». Asked for where the
 * phone is, rounded to about a kilometre, and kept for the air.
 */

export const WIND_TITLE = tLater("Wind aloft");
export const NO_WIND = tLater("Wind aloft not available");
export const MODEL_RUN = tLater("{source} · run of {time}");
/** Hours shown, from now. */
export const HOURS_SHOWN = 6;
/** About how high each level is in the standard atmosphere, metres. */
export const LEVEL_HEIGHT_M: Readonly<Record<number, number>> = {
  850: 1500,
  700: 3000,
  600: 4200,
  500: 5600,
};

/** The speed in the app's units: km/h or mph. */
export function windSpeedText(ms: number | null, units: Units): string {
  if (ms === null) {
    return "–";
  }
  return String(Math.round(units === "mi" ? ms * 2.236936 : ms * 3.6));
}

export function WindCard({ nowMs }: { nowMs?: number }) {
  // The hours from when the page opened: Date.now() is no render's.
  const [openedMs] = useState(() => Date.now());
  const at = nowMs ?? openedMs;
  const { position } = useCurrentPosition();
  const kept = useWinds();
  const units = useUnits();
  const place = position.status === "ok" ? position.point : null;
  useEffect(() => {
    if (place !== null) {
      void refreshWinds(place, Date.now());
    }
    // Once a place: a new reading of the same place asks nothing more.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place?.[0], place?.[1]]);
  const winds = kept?.winds ?? null;
  const hours =
    winds === null
      ? []
      : winds.hours
          .filter((hour) => Date.parse(hour.time) >= at - 3600_000)
          .slice(0, HOURS_SHOWN);
  return (
    <View style={styles.box} testID="wind-card">
      <Text style={styles.title} accessibilityRole="header">
        {t(WIND_TITLE)}
      </Text>
      {winds === null || hours.length === 0 ? (
        <Text style={styles.muted} testID="wind-none">
          {t(NO_WIND)}
        </Text>
      ) : (
        <>
          <View style={styles.row}>
            <Text style={[styles.cell, styles.time]} />
            {winds.levels.map((hpa) => (
              <Text key={hpa} style={[styles.cell, styles.head]}>
                {`${hpa} hPa\n≈${LEVEL_HEIGHT_M[hpa] ?? "?"} m`}
              </Text>
            ))}
          </View>
          {hours.map((hour) => (
            <View key={hour.time} style={styles.row} testID="wind-hour">
              <Text style={[styles.cell, styles.time]}>
                {clockText(Date.parse(hour.time))}
              </Text>
              {hour.winds.map((wind) => (
                <View
                  key={wind.hpa}
                  style={[styles.cell, styles.wind]}
                  accessibilityLabel={
                    wind.from_deg === null
                      ? "–"
                      : `${wind.from_deg}° ${windSpeedText(wind.speed_ms, units)}`
                  }
                >
                  {wind.from_deg !== null ? (
                    // Where the wind goes: from north, pointing down.
                    <Text
                      style={[
                        styles.arrow,
                        { transform: [{ rotate: `${wind.from_deg}deg` }] },
                      ]}
                    >
                      ↓
                    </Text>
                  ) : null}
                  <Text style={styles.speed}>
                    {windSpeedText(wind.speed_ms, units)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
          <Text style={styles.muted}>{units === "mi" ? "mph" : "km/h"}</Text>
          <Text style={styles.muted} testID="wind-run">
            {t(MODEL_RUN, {
              source: winds.attribution,
              time: clockText(Date.parse(winds.run)),
            })}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: space.xs, paddingTop: space.sm },
  title: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  row: { flexDirection: "row", alignItems: "center" },
  cell: { flex: 1, textAlign: "center" },
  time: {
    flex: 0.8,
    color: color.textMuted,
    fontSize: fontSize.small,
    textAlign: "left",
  },
  head: { color: color.textMuted, fontSize: fontSize.small },
  wind: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  arrow: { color: color.text, fontSize: fontSize.body, fontWeight: fontWeight.bold },
  speed: { color: color.text, fontSize: fontSize.body, fontVariant: ["tabular-nums"] },
  muted: { color: color.textMuted, fontSize: fontSize.small },
});
