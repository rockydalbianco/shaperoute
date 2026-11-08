import type {
  AltitudeWeather,
  SkiResortWeather,
  WeatherHour,
} from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { fetchSkiResortWeather } from "../api/skiResorts";
import { decimal, t } from "../i18n";
import { appLanguage } from "../i18n/language";
import { color, font, fontWeight, radius, space } from "../theme/tokens";
import { METRES_PER_FOOT } from "../units/format";
import type { Units } from "../units/units";
import { useUnits } from "../units/useUnits";

/** One hour in this many is shown in the row of the day. */
export const HOUR_STEP = 3;
const CM_PER_INCH = 2.54;

/** What the weather has to show. */
type Shown =
  | { kind: "loading" }
  | { kind: "ready"; weather: SkiResortWeather }
  | { kind: "failed" };

/** "1,200", "1.200", "1 200": a whole number as the app's language writes it. */
export function grouped(value: number): string {
  const digits = String(Math.round(Math.abs(value)));
  const separator = appLanguage() === "en" ? "," : appLanguage() === "fr" ? " " : ".";
  const whole = digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return value < 0 ? `−${whole}` : whole;
}

/** "1.200 m", "3,937 ft": an altitude, in feet with miles. */
export function altitudeLabel(metres: number, units: Units): string {
  return units === "mi"
    ? `${grouped(metres / METRES_PER_FOOT)} ft`
    : `${grouped(metres)} m`;
}

/** "−3°": in Celsius, in Fahrenheit with miles. */
export function temperatureLabel(celsius: number, units: Units): string {
  const degrees = Math.round(units === "mi" ? (celsius * 9) / 5 + 32 : celsius);
  return `${degrees < 0 ? "−" : ""}${Math.abs(degrees)}°`;
}

/** "4,5 cm", "1.8 in": the snow, in inches with miles. */
export function snowLabel(cm: number, units: Units): string {
  return units === "mi" ? `${decimal(cm / CM_PER_INCH)} in` : `${decimal(cm)} cm`;
}

/** MET Norway's symbol_code, as a sign: its name less «_day», «_night». */
export function symbolSign(symbol: string | null): string {
  if (symbol === null) {
    return "";
  }
  const name = symbol.replace(/_(day|night|polartwilight)$/, "");
  if (name.includes("thunder")) return "⛈";
  if (name.includes("snow")) return "❄️";
  if (name.includes("sleet")) return "🌨";
  if (name.includes("rain")) return "🌧";
  if (name === "fog") return "🌫";
  if (name === "cloudy") return "☁️";
  if (name === "partlycloudy") return "⛅";
  if (name === "fair") return "🌤";
  if (name === "clearsky") return symbol.endsWith("_night") ? "🌙" : "☀️";
  return "";
}

/** The hours of the row: the one now in, then one every HOUR_STEP. */
export function shownHours(hours: readonly WeatherHour[]): WeatherHour[] {
  return hours.filter((_, i) => i % HOUR_STEP === 0);
}

type Props = {
  resortId: string;
  apiUrl: string | null;
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/**
 * The weather of a resort (TASK-406 part C, ADR-0338): the next 24 hours
 * at its base and at its top from MET Norway, through the API, with the
 * fresh snow expected there, said as the estimate it is.
 */
export function ResortWeather({ resortId, apiUrl, fetchFn, apiKey }: Props) {
  const units = useUnits();
  // The answer, with the resort it is of: another resort shows «loading»
  // until its own comes.
  const [read, setRead] = useState<{ resortId: string; shown: Shown } | null>(null);
  useEffect(() => {
    if (apiUrl === null) {
      return;
    }
    let gone = false;
    void fetchSkiResortWeather(apiUrl, resortId, { fetchFn, key: apiKey }).then(
      (outcome) => {
        if (!gone) {
          setRead({
            resortId,
            shown:
              outcome.kind === "ok"
                ? { kind: "ready", weather: outcome.value }
                : { kind: "failed" },
          });
        }
      },
    );
    return () => {
      gone = true;
    };
  }, [apiKey, apiUrl, fetchFn, resortId]);
  const shown: Shown =
    apiUrl === null
      ? { kind: "failed" }
      : read !== null && read.resortId === resortId
        ? read.shown
        : { kind: "loading" };

  return (
    <View style={styles.box} testID="resort-weather">
      <Text style={styles.heading} accessibilityRole="header">
        {t("Next 24 hours")}
      </Text>
      {shown.kind === "loading" ? (
        <ActivityIndicator style={styles.wait} color={color.textMuted} />
      ) : shown.kind === "failed" ? (
        <Text style={styles.note}>{t("Weather unavailable right now.")}</Text>
      ) : (
        <>
          {shown.weather.stale && (
            <Text style={styles.note} testID="weather-stale">
              {t("Older forecast: MET Norway is not answering.")}
            </Text>
          )}
          <Altitude
            title={t("Base")}
            side={shown.weather.base}
            units={units}
            testID="weather-base"
          />
          {shown.weather.top !== null && (
            <Altitude
              title={t("Top@@resort")}
              side={shown.weather.top}
              units={units}
              testID="weather-top"
            />
          )}
          <Text style={styles.note}>
            {t("Estimated from the forecast, not a snow report.")}
          </Text>
        </>
      )}
    </View>
  );
}

function Altitude({
  title,
  side,
  units,
  testID,
}: {
  title: string;
  side: AltitudeWeather;
  units: Units;
  testID: string;
}) {
  const now = side.hours[0];
  return (
    <View style={styles.altitude} testID={testID}>
      <View style={styles.altitudeTop}>
        <Text style={styles.title}>
          {side.altitude_m === null
            ? title
            : `${title} · ${altitudeLabel(side.altitude_m, units)}`}
        </Text>
        {now?.temperature_c != null && (
          <Text style={styles.now}>
            {`${symbolSign(now.symbol)} ${temperatureLabel(now.temperature_c, units)}`.trim()}
          </Text>
        )}
      </View>
      <View style={styles.snow}>
        <Text style={styles.snowLabel}>{t("Fresh snow")}</Text>
        <Text style={styles.snowValue} testID={`${testID}-snow`}>
          {snowLabel(side.fresh_snow_cm, units)}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.hours}>
          {shownHours(side.hours).map((hour) => (
            <View key={hour.time} style={styles.hour} testID="weather-hour">
              <Text style={styles.hourTime}>
                {String(new Date(hour.time).getHours()).padStart(2, "0")}
              </Text>
              <Text style={styles.hourSign}>{symbolSign(hour.symbol)}</Text>
              <Text style={styles.hourTemp}>
                {hour.temperature_c === null
                  ? "–"
                  : temperatureLabel(hour.temperature_c, units)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: space.sm,
  },
  heading: {
    ...font.label,
    color: color.textMuted,
  },
  wait: {
    paddingVertical: space.lg,
  },
  note: {
    ...font.small,
    color: color.textMuted,
  },
  altitude: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
  },
  altitudeTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  title: {
    ...font.body,
    color: color.text,
    fontWeight: fontWeight.semibold,
  },
  now: {
    ...font.body,
    color: color.text,
  },
  snow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  snowLabel: {
    ...font.small,
    color: color.textMuted,
  },
  snowValue: {
    ...font.small,
    color: color.text,
    fontWeight: fontWeight.semibold,
  },
  hours: {
    flexDirection: "row",
    gap: space.md,
  },
  hour: {
    alignItems: "center",
    minWidth: 36,
  },
  hourTime: {
    ...font.detail,
    color: color.textMuted,
  },
  hourSign: {
    ...font.body,
  },
  hourTemp: {
    ...font.small,
    color: color.text,
  },
});
