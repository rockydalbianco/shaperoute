import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { fontWeight, type Palette } from "../theme/tokens";
import type { Units } from "../units/units";
import { type FlightUnits, UNIT_LABEL } from "./flightUnits";
import {
  altitudeText,
  bearingText,
  clockText,
  distanceText,
  distanceUnit,
  durationText,
  glideText,
  heightChangeText,
  NO_VALUE,
  speedText,
  varioText,
} from "./flightUnits";
import { WIDGET_NAME, type WidgetId } from "./flightLayout";
import type { FlightScreenData } from "./useFlightScreenData";
import { AltitudeChart } from "./widgets/AltitudeChart";
import { Arrow, Dial } from "./widgets/CompassRose";
import { ThermalAssistant } from "./widgets/ThermalAssistant";

/**
 * One widget of the flight screen (TASK-479 part B1): its name small on
 * top, its number as big as its cell allows, its unit beside. Read at arm's
 * length, in the sun, with gloves: high contrast, nothing small that
 * matters. Numbers only, never advice.
 */

/** A climb from this much paints the vario in the accent. */
export const CLIMB_SHOWN_MPS = 0.2;

type Props = {
  widget: WidgetId;
  data: FlightScreenData;
  flight: FlightUnits;
  units: Units;
  palette: Palette;
  width: number;
  height: number;
};

function Box({
  name,
  value,
  unit,
  palette,
  height,
  background,
  ink,
  under,
  side,
  testID,
}: {
  name: string;
  value: string;
  unit?: string;
  palette: Palette;
  height: number;
  background?: string;
  ink?: string;
  under?: string;
  side?: ReactNode;
  testID: string;
}) {
  const text = ink ?? palette.text;
  const big = Math.max(20, Math.min(height * 0.52, 140));
  return (
    <View
      style={[styles.box, { backgroundColor: background ?? palette.surface, borderColor: palette.border }]}
      testID={testID}
    >
      <Text style={[styles.name, { color: ink ?? palette.textMuted }]} numberOfLines={1}>
        {name}
      </Text>
      <View style={styles.row}>
        {side}
        <Text
          style={[styles.value, { color: text, fontSize: big, lineHeight: big * 1.08 }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.3}
        >
          {value}
        </Text>
        {unit !== undefined ? (
          <Text style={[styles.unit, { color: ink ?? palette.textMuted, fontSize: Math.max(14, big * 0.28) }]}>
            {unit}
          </Text>
        ) : null}
      </View>
      {under !== undefined ? (
        <Text style={[styles.under, { color: ink ?? palette.textMuted }]} numberOfLines={1}>
          {under}
        </Text>
      ) : null}
    </View>
  );
}

export function FlightWidget({ widget, data, flight, units, palette, width, height }: Props) {
  const name = t(WIDGET_NAME[widget]);
  const now = data.instrument;
  const id = `widget-${widget}`;
  const box = (value: string, unit?: string, extra: Partial<Parameters<typeof Box>[0]> = {}) => (
    <Box name={name} value={value} unit={unit} palette={palette} height={height} testID={id} {...extra} />
  );
  switch (widget) {
    case "altitude":
      return box(altitudeText(now.altM, flight.altitude), UNIT_LABEL[flight.altitude]);
    case "aboveTakeoff":
      return box(heightChangeText(now.aboveTakeoffM, flight.altitude), UNIT_LABEL[flight.altitude]);
    case "vario":
    case "varioAvg": {
      const mps = widget === "vario" ? now.varioMps : now.varioAvgMps;
      const climbing = mps !== null && mps >= CLIMB_SHOWN_MPS;
      return box(varioText(mps, flight.vario), UNIT_LABEL[flight.vario], {
        background: climbing ? palette.accent : undefined,
        ink: climbing ? palette.onAccent : undefined,
      });
    }
    case "thermalAvg":
      return box(varioText(data.thermal?.avgMps ?? null, flight.vario), UNIT_LABEL[flight.vario]);
    case "thermalGain":
      return box(heightChangeText(data.thermal?.gainM ?? null, flight.altitude), UNIT_LABEL[flight.altitude]);
    case "groundSpeed":
      return box(speedText(now.speedMps, flight.speed), UNIT_LABEL[flight.speed]);
    case "glide":
      return box(glideText(now.glideRatio));
    case "track": {
      const dial = Math.min(height * 0.55, width * 0.4);
      return box(bearingText(now.trackDeg), undefined, {
        side:
          now.trackDeg === null ? null : (
            <Dial size={dial} northDeg={-now.trackDeg} palette={palette} />
          ),
      });
    }
    case "wind": {
      const wind = data.wind;
      const arrow = Math.min(height * 0.5, width * 0.35);
      return box(wind === null ? NO_VALUE : speedText(wind.speedMps, flight.speed), UNIT_LABEL[flight.speed], {
        // The arrow goes where the wind goes, north up.
        side: wind === null ? null : <Arrow size={arrow} deg={wind.fromDeg + 180} color={palette.text} />,
        under:
          wind === null
            ? undefined
            : t("From {bearing} · {minutes} min ago", {
                bearing: bearingText(wind.fromDeg),
                minutes: String(Math.max(0, Math.round((data.nowMs - wind.atMs) / 60_000))),
              }),
      });
    }
    case "takeoff": {
      const arrow = Math.min(height * 0.5, width * 0.35);
      const bearing = now.takeoffBearingDeg;
      // The way back, as the pilot goes: up is straight on.
      const onScreen = bearing === null ? null : bearing - (now.trackDeg ?? 0);
      return box(distanceText(now.takeoffDistanceM, units), distanceUnit(now.takeoffDistanceM, units), {
        side: onScreen === null ? null : <Arrow size={arrow} deg={onScreen} color={palette.text} />,
        under: bearing === null ? undefined : bearingText(bearing),
      });
    }
    case "flightTime":
      return box(durationText(now.flightMs));
    case "clock":
      return box(clockText(data.nowMs));
    case "gpsAccuracy":
      return box(now.accuracyM === null ? NO_VALUE : `±${Math.round(now.accuracyM)}`, "m");
    case "live":
      return box(data.live ? t("Sharing live") : t("Off"));
    case "thermalAssistant": {
      const size = Math.min(width, height) - 16;
      return (
        <View style={[styles.box, styles.drawing, { backgroundColor: palette.surface, borderColor: palette.border }]} testID={id}>
          <Text style={[styles.name, styles.corner, { color: palette.textMuted }]}>{name}</Text>
          <ThermalAssistant assistant={data.assistant} size={size} palette={palette} />
        </View>
      );
    }
    case "altitudeChart":
      return (
        <View style={[styles.box, { backgroundColor: palette.surface, borderColor: palette.border }]} testID={id}>
          <Text style={[styles.name, { color: palette.textMuted }]}>{name}</Text>
          <Text style={[styles.chartNow, { color: palette.text }]}>
            {altitudeText(now.altM, flight.altitude)} {UNIT_LABEL[flight.altitude]}
          </Text>
          <AltitudeChart series={data.altitudes} width={width - 20} height={Math.max(20, height - 70)} palette={palette} />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: "center",
    overflow: "hidden",
  },
  drawing: { alignItems: "center" },
  corner: { position: "absolute", top: 6, left: 10 },
  name: { fontSize: 13, fontWeight: fontWeight.semibold, letterSpacing: 0.4, textTransform: "uppercase" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  value: { flexShrink: 1, fontWeight: fontWeight.bold, fontVariant: ["tabular-nums"] },
  unit: { fontWeight: fontWeight.semibold },
  under: { fontSize: 14, fontWeight: fontWeight.medium },
  chartNow: { fontSize: 22, fontWeight: fontWeight.bold, fontVariant: ["tabular-nums"] },
});
