import { useContext, useMemo, useState } from "react";
import {
  type LayoutChangeEvent,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { t, tLater } from "../i18n";
import type { Track } from "../navigation/trackRecorder";
import { TICK_MS, useNow } from "../screens/RunPanel";
import { BRIGHTNESS_STEPS } from "../theme/tone";
import { fontWeight, type Palette, paletteOf } from "../theme/tokens";
import { useUnits } from "../units/useUnits";
import {
  type FlightLook,
  type FlightPrefs,
  GRID_COLUMNS,
  GRID_ROWS,
  loadFlightPrefs,
  type Page,
  PRESET_NAME,
  PRESET_PAGES,
  PRESETS,
  saveFlightPrefs,
} from "./flightLayout";
import {
  ALTITUDE_UNITS,
  type FlightUnits,
  SPEED_UNITS,
  UNIT_LABEL,
  VARIO_UNITS,
} from "./flightUnits";
import { FlightWidget } from "./FlightWidget";
import { useFlightScreenData } from "./useFlightScreenData";

/**
 * The flight screen (TASK-479 part B1, ADR-0388): pages of widgets on a
 * grid, the preset the pilot chose, dark or bright for the sun, always
 * upright (landscape comes with the native build after 1.1, the user's
 * choice). Big numbers, targets for gloves, a lock against touches. «Map»
 * goes back to the recording, where «Stop» is: no flight stops from here.
 * The line at the bottom is the user's, approved on 2026-11-21.
 */

export const FIXED_LINE = tLater("GPS numbers · not a certified instrument");
/** Hold the lock this long to undo it. */
export const UNLOCK_HOLD_MS = 1500;
/** Targets for gloved fingers, points. */
export const GLOVE_TARGET = 64;
const GAP = 6;

function paletteFor(look: FlightLook): Palette {
  return look === "dark"
    ? paletteOf({ tone: "dark", dark: 0, light: BRIGHTNESS_STEPS - 1 })
    : paletteOf({ tone: "light", dark: 0, light: BRIGHTNESS_STEPS - 1 });
}

type Props = {
  visible: boolean;
  onClose: () => void;
  track: Track;
  live: boolean;
  /** When the flight went into the air, null before. */
  takeoffMs: number | null;
  sharingLive: boolean;
};

function Chip({
  label,
  on,
  onPress,
  palette,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  palette: Palette;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: on ? palette.accent : palette.surfaceRaised,
          borderColor: on ? palette.accent : palette.border,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: on ? palette.onAccent : palette.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Options({
  prefs,
  onChange,
  onDone,
  palette,
}: {
  prefs: FlightPrefs;
  onChange: (prefs: FlightPrefs) => void;
  onDone: () => void;
  palette: Palette;
}) {
  const units = (patch: Partial<FlightUnits>) =>
    onChange({ ...prefs, units: { ...prefs.units, ...patch } });
  const row = (title: string, chips: React.ReactNode) => (
    <View style={styles.optionRow}>
      <Text style={[styles.optionTitle, { color: palette.textMuted }]}>{title}</Text>
      <View style={styles.chips}>{chips}</View>
    </View>
  );
  return (
    <View
      style={[styles.options, { backgroundColor: palette.background }]}
      testID="flight-options"
    >
      {row(
        t("Layout"),
        PRESETS.map((preset) => (
          <Chip
            key={preset}
            label={t(PRESET_NAME[preset])}
            on={prefs.preset === preset}
            onPress={() => onChange({ ...prefs, preset })}
            palette={palette}
          />
        )),
      )}
      {row(
        t("Look"),
        <>
          <Chip
            label={t("Dark")}
            on={prefs.look === "dark"}
            onPress={() => onChange({ ...prefs, look: "dark" })}
            palette={palette}
          />
          <Chip
            label={t("Sunlight")}
            on={prefs.look === "sun"}
            onPress={() => onChange({ ...prefs, look: "sun" })}
            palette={palette}
          />
        </>,
      )}
      {row(
        t("Altitude"),
        ALTITUDE_UNITS.map((unit) => (
          <Chip
            key={unit}
            label={UNIT_LABEL[unit]}
            on={prefs.units.altitude === unit}
            onPress={() => units({ altitude: unit })}
            palette={palette}
          />
        )),
      )}
      {row(
        t("Vario"),
        VARIO_UNITS.map((unit) => (
          <Chip
            key={unit}
            label={UNIT_LABEL[unit]}
            on={prefs.units.vario === unit}
            onPress={() => units({ vario: unit })}
            palette={palette}
          />
        )),
      )}
      {row(
        t("Speed"),
        SPEED_UNITS.map((unit) => (
          <Chip
            key={unit}
            label={UNIT_LABEL[unit]}
            on={prefs.units.speed === unit}
            onPress={() => units({ speed: unit })}
            palette={palette}
          />
        )),
      )}
      <Pressable
        accessibilityRole="button"
        onPress={onDone}
        style={[styles.done, { backgroundColor: palette.accent }]}
        testID="flight-options-done"
      >
        <Text style={[styles.doneText, { color: palette.onAccent }]}>{t("Done")}</Text>
      </Pressable>
    </View>
  );
}

function PageView({
  page,
  width,
  height,
  render,
}: {
  page: Page;
  width: number;
  height: number;
  render: (cell: Page[number], w: number, h: number) => React.ReactNode;
}) {
  const cellW = (width - GAP * (GRID_COLUMNS + 1)) / GRID_COLUMNS;
  const cellH = (height - GAP * (GRID_ROWS + 1)) / GRID_ROWS;
  return (
    <View style={{ width, height }}>
      {page.map((cell) => {
        const w = cellW * cell.w + GAP * (cell.w - 1);
        const h = cellH * cell.h + GAP * (cell.h - 1);
        return (
          <View
            key={`${cell.widget}-${cell.col}-${cell.row}`}
            style={{
              position: "absolute",
              left: GAP + cell.col * (cellW + GAP),
              top: GAP + cell.row * (cellH + GAP),
              width: w,
              height: h,
            }}
          >
            {render(cell, w, h)}
          </View>
        );
      })}
    </View>
  );
}

export function FlightScreen({
  visible,
  onClose,
  track,
  live,
  takeoffMs,
  sharingLive,
}: Props) {
  const appUnits = useUnits();
  const [prefs, setPrefs] = useState<FlightPrefs>(() => loadFlightPrefs(appUnits));
  const [choosing, setChoosing] = useState(false);
  const [locked, setLocked] = useState(false);
  const [hint, setHint] = useState(false);
  const [page, setPage] = useState(0);
  const [area, setArea] = useState({ width: 0, height: 0 });
  // The app has the provider; a screen tested alone does not.
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0 };
  const now = useNow(visible && live, TICK_MS);
  const at = live ? now : (track.fixes[track.fixes.length - 1]?.timeMs ?? now);
  const data = useFlightScreenData(track, at, takeoffMs, sharingLive);
  const palette = useMemo(() => paletteFor(prefs.look), [prefs.look]);
  const pages = PRESET_PAGES[prefs.preset];
  const change = (next: FlightPrefs) => {
    setPrefs(next);
    saveFlightPrefs(next);
    if (next.preset !== prefs.preset) {
      setPage(0);
    }
  };
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea({ width, height });
  };
  const onScrolled = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (area.width > 0) {
      setPage(Math.round(event.nativeEvent.contentOffset.x / area.width));
    }
  };
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      supportedOrientations={["portrait"]}
    >
      <StatusBar barStyle={prefs.look === "dark" ? "light-content" : "dark-content"} />
      <View
        style={[
          styles.screen,
          {
            backgroundColor: palette.background,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
        testID="flight-screen"
      >
        <View style={styles.bar}>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            disabled={locked}
            style={[styles.barButton, { borderColor: palette.borderStrong }]}
            testID="flight-screen-map"
          >
            <Text
              style={[styles.barText, { color: palette.text }]}
            >{`← ${t("Map")}`}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setChoosing(true)}
            disabled={locked}
            style={[
              styles.barButton,
              styles.barMiddle,
              { borderColor: palette.borderStrong },
            ]}
            testID="flight-screen-layout"
          >
            <Text style={[styles.barText, { color: palette.text }]} numberOfLines={1}>
              {`${t(PRESET_NAME[prefs.preset])} ▾`}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={locked ? t("Hold to unlock") : t("Lock")}
            onPress={() => (locked ? setHint(true) : setLocked(true))}
            onLongPress={() => {
              setLocked(false);
              setHint(false);
            }}
            delayLongPress={UNLOCK_HOLD_MS}
            style={[
              styles.barButton,
              {
                borderColor: locked ? palette.accent : palette.borderStrong,
                backgroundColor: locked ? palette.accent : undefined,
              },
            ]}
            testID="flight-screen-lock"
          >
            <Text
              style={[
                styles.barText,
                { color: locked ? palette.onAccent : palette.text },
              ]}
            >
              {locked ? "🔒" : "🔓"}
            </Text>
          </Pressable>
        </View>
        {locked && hint ? (
          <Text style={[styles.hint, { color: palette.text }]}>
            {t("Hold to unlock")}
          </Text>
        ) : null}
        <View style={styles.pages} onLayout={onLayout} testID="flight-pages">
          {area.width > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              scrollEnabled={!locked}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onScrolled}
              key={prefs.preset}
            >
              {pages.map((one, index) => (
                <PageView
                  key={index}
                  page={one}
                  width={area.width}
                  height={area.height}
                  render={(cell, w, h) => (
                    <FlightWidget
                      widget={cell.widget}
                      data={data}
                      flight={prefs.units}
                      units={appUnits}
                      palette={palette}
                      width={w}
                      height={h}
                    />
                  )}
                />
              ))}
            </ScrollView>
          ) : null}
          {locked ? (
            <View style={StyleSheet.absoluteFill} testID="flight-screen-locked" />
          ) : null}
        </View>
        <View style={styles.dots}>
          {pages.length > 1
            ? pages.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    { backgroundColor: index === page ? palette.text : palette.border },
                  ]}
                />
              ))
            : null}
        </View>
        <Text style={[styles.fixed, { color: palette.textMuted }]}>
          {t(FIXED_LINE)}
        </Text>
        {choosing ? (
          <Options
            prefs={prefs}
            onChange={change}
            onDone={() => setChoosing(false)}
            palette={palette}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: "row", gap: GAP, paddingHorizontal: GAP, paddingTop: GAP },
  barButton: {
    minHeight: GLOVE_TARGET,
    minWidth: GLOVE_TARGET,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  barMiddle: { flex: 1 },
  barText: { fontSize: 20, fontWeight: fontWeight.bold },
  hint: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: fontWeight.semibold,
    paddingTop: 4,
  },
  pages: { flex: 1 },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    height: 14,
    alignItems: "center",
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  fixed: { textAlign: "center", fontSize: 12, paddingVertical: 4 },
  options: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    paddingTop: 60,
    gap: 18,
  },
  optionRow: { gap: 8 },
  optionTitle: {
    fontSize: 14,
    fontWeight: fontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    minHeight: GLOVE_TARGET,
    minWidth: GLOVE_TARGET,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { fontSize: 18, fontWeight: fontWeight.bold },
  done: {
    minHeight: GLOVE_TARGET,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  doneText: { fontSize: 20, fontWeight: fontWeight.bold },
});
