import type { SkiResortWeather } from "@shaperoute/shared-types";
import { useContext, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { apiUrl as configuredApiUrl } from "../api/apiUrl";
import { fetchSkiResortWeather, findSkiResorts } from "../api/skiResorts";
import { t } from "../i18n";
import { type PositionState, readPosition } from "../location/useCurrentPosition";
import { color, font, fontWeight, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { SheetModal } from "../ui/SheetModal";
import { useUnits } from "../units/useUnits";
import { ResortList } from "./ResortList";
import { snowLabel, temperatureLabel } from "./ResortWeather";
import { type DayResort as Chosen, loadDayResort, saveDayResort } from "./skiDayStore";

/** A resort farther than this from where the day starts is not taken by
 * itself: the skier picks one with «Change». */
export const NEAR_RESORT_M = 5_000;

type Props = {
  apiUrl?: string | null;
  fetchFn?: typeof fetch;
  apiKey?: string | null;
  locate?: () => Promise<PositionState>;
};

type Found =
  { kind: "finding" } | { kind: "none" } | { kind: "chosen"; resort: Chosen };

/** The temperature now and the fresh snow, at the resort's base. */
export function weatherLine(
  weather: SkiResortWeather,
  units: ReturnType<typeof useUnits>,
): string | null {
  const celsius = weather.base.hours[0]?.temperature_c ?? null;
  if (celsius === null) {
    return null;
  }
  return t("{temperature} now · {snow} fresh snow", {
    temperature: temperatureLabel(celsius, units),
    snow: snowLabel(weather.base.fresh_snow_cm, units),
  });
}

/**
 * The resort of the day, over the numbers of «Record your day» on the snow
 * (TASK-406 part D2, ADR-0338): the nearest one, found from where the day
 * starts (the position rounded to about a kilometre, as the «Ski» search),
 * with its temperature and fresh snow; «Change» picks another by name or
 * near. It stays for the day, also when the app is opened again.
 */
export function DayResort({
  apiUrl = configuredApiUrl(),
  fetchFn,
  apiKey,
  locate = readPosition,
}: Props) {
  const units = useUnits();
  const [found, setFound] = useState<Found>(() => {
    const kept = loadDayResort();
    return kept === null ? { kind: "finding" } : { kind: "chosen", resort: kept };
  });
  const [picking, setPicking] = useState(false);

  // The nearest, once, when the day has none yet.
  const finding = found.kind === "finding";
  useEffect(() => {
    if (!finding) {
      return;
    }
    let gone = false;
    void (async () => {
      const position = await locate();
      if (gone) {
        return;
      }
      if (position.status !== "ok" || apiUrl === null) {
        setFound({ kind: "none" });
        return;
      }
      const outcome = await findSkiResorts(
        apiUrl,
        { near: position.point },
        { fetchFn, key: apiKey },
      );
      if (gone) {
        return;
      }
      const nearest = outcome.kind === "ok" ? outcome.value.resorts[0] : undefined;
      if (nearest === undefined || (nearest.away_m ?? Infinity) > NEAR_RESORT_M) {
        setFound({ kind: "none" });
        return;
      }
      saveDayResort(nearest);
      setFound({ kind: "chosen", resort: loadDayResort() ?? { ...nearest, at: 0 } });
    })();
    return () => {
      gone = true;
    };
  }, [apiKey, apiUrl, fetchFn, finding, locate]);

  const resortId = found.kind === "chosen" ? found.resort.id : null;
  const [weather, setWeather] = useState<SkiResortWeather | null>(null);
  useEffect(() => {
    if (resortId === null || apiUrl === null) {
      return;
    }
    let gone = false;
    void fetchSkiResortWeather(apiUrl, resortId, { fetchFn, key: apiKey }).then(
      (outcome) => {
        if (!gone && outcome.kind === "ok") {
          setWeather(outcome.value);
        }
      },
    );
    return () => {
      gone = true;
    };
  }, [apiKey, apiUrl, fetchFn, resortId]);

  const line =
    weather !== null && weather.resort_id === resortId
      ? weatherLine(weather, units)
      : null;

  return (
    <View style={styles.row} testID="day-resort">
      <View style={styles.words}>
        {found.kind === "chosen" ? (
          <>
            <Text style={styles.name} numberOfLines={1}>
              {found.resort.name}
            </Text>
            {line !== null && <Text style={styles.weather}>{line}</Text>}
          </>
        ) : found.kind === "none" ? (
          <Text style={styles.weather}>{t("No ski resort nearby")}</Text>
        ) : null}
      </View>
      <Pressable
        style={styles.change}
        onPress={() => setPicking(true)}
        accessibilityRole="button"
        accessibilityLabel={t("Where are you skiing?")}
        testID="day-resort-change"
      >
        <Text style={styles.changeText}>{t("Change@@resort")}</Text>
      </Pressable>
      <ResortPicker
        visible={picking}
        apiUrl={apiUrl}
        fetchFn={fetchFn}
        apiKey={apiKey}
        locate={locate}
        onClose={() => setPicking(false)}
        onPick={(resort) => {
          saveDayResort(resort);
          setFound({ kind: "chosen", resort: loadDayResort() ?? { ...resort, at: 0 } });
          setPicking(false);
        }}
      />
    </View>
  );
}

function ResortPicker({
  visible,
  onClose,
  onPick,
  apiUrl,
  ...options
}: Props & {
  visible: boolean;
  onClose: () => void;
  onPick: (resort: { id: string; name: string }) => void;
  apiUrl: string | null;
}) {
  // Without the app around it (a test of the card on the snow), no inset.
  const bottom = useContext(SafeAreaInsetsContext)?.bottom ?? 0;
  const [typed, setTyped] = useState("");
  return (
    <SheetModal
      visible={visible}
      onRequestClose={onClose}
      onHidden={() => setTyped("")}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessible={false}
        importantForAccessibility="no"
      />
      <View
        style={[styles.sheet, { paddingBottom: bottom + space.sm }]}
        testID="day-resort-picker"
      >
        <Text style={styles.title} accessibilityRole="header">
          {t("Where are you skiing?")}
        </Text>
        <TextInput
          style={styles.input}
          value={typed}
          onChangeText={setTyped}
          accessibilityLabel={t("Where are you skiing?")}
          autoCorrect={false}
          returnKeyType="search"
          placeholderTextColor={color.textMuted}
          testID="day-resort-search"
        />
        <View style={styles.list}>
          {visible && (
            <ResortList typed={typed} apiUrl={apiUrl} onPick={onPick} {...options} />
          )}
        </View>
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  words: {
    flex: 1,
    gap: space.xs,
  },
  name: {
    ...font.body,
    fontWeight: fontWeight.semibold,
    color: color.text,
  },
  weather: {
    ...font.small,
    color: color.textMuted,
  },
  change: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  changeText: {
    ...font.body,
    fontWeight: fontWeight.semibold,
    color: color.text,
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    maxHeight: "80%",
    gap: space.sm,
    padding: space.lg,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: color.hairline,
    backgroundColor: color.surface,
  },
  title: {
    ...font.heading,
    color: color.text,
  },
  input: {
    ...font.body,
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    color: color.text,
  },
  list: {
    flexShrink: 1,
  },
});
