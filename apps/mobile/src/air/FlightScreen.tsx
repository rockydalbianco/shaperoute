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
  pagesOf,
  profileName,
  WIDGET_UNIT_KIND,
  saveFlightPrefs,
} from "./flightLayout";
import {
  ALTITUDE_UNITS,
  type FlightUnits,
  SPEED_UNITS,
  UNIT_LABEL,
  VARIO_UNITS,
} from "./flightUnits";
import { useAirspaceAlerts } from "./airspaceAlertPrefs";
import { AirspaceAlertLine } from "./AirspaceAlertLine";
import { airspaceFeatures, alertOf, nearAirspaces } from "./airspaceNear";
import { placeSeries, type ProfileBand, profileBands } from "./airspaceProfile";
import { AirspaceOptions } from "./AirspaceOptions";
import { useAirspace } from "./airspaceStore";
import { FlightEditor } from "./FlightEditor";
import { FlightMap } from "./FlightMap";
import { FlightWidget } from "./FlightWidget";
import { GroundProbe } from "./GroundProbe";
import { useFlightScreenData } from "./useFlightScreenData";
import { setVarioPrefs, useVarioPrefs } from "./varioPrefs";
import { VarioSoundOptions } from "./VarioSoundOptions";

/**
 * The flight screen (TASK-479 part B1, ADR-0388): pages of widgets on a
 * grid, the preset the pilot chose, dark or bright for the sun, always
 * upright (landscape comes with the native build after 1.1, the user's
 * choice). Big numbers, targets for gloves, a lock against touches. «Map»
 * goes back to the recording, where «Stop» is: no flight stops from here.
 * The line at the bottom is the user's, approved on 2026-11-21.
 *
 * The vario's sound (part C): a button beside the lock mutes it or turns
 * it on, the lock on or not; its choices are among the options. The sound
 * itself is the recording's (`useVarioSound` in `FlightLive`), so it goes
 * on with this screen closed.
 *
 * The map and the height above the ground (part A1): a «Map» widget is the
 * flight map (`FlightMap`); with «Height above ground» on a page of the
 * profile, a page out of sight reads the ground (`GroundProbe`).
 */

export const FIXED_LINE = tLater("GPS numbers · not a certified instrument");
/** Hold a widget this long to open the editor (part B2). */
export const EDIT_HOLD_MS = 700;
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
  onEdit,
  palette,
  insets,
}: {
  /** Inside the safe area: the options scroll, and would go under the
   * status bar and the home bar. */
  insets: { top: number; bottom: number };
  prefs: FlightPrefs;
  onChange: (prefs: FlightPrefs) => void;
  onDone: () => void;
  onEdit: () => void;
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
    <ScrollView
      style={[styles.options, { ...insets, backgroundColor: palette.background }]}
      contentContainerStyle={styles.optionsInside}
      testID="flight-options"
    >
      {row(
        t("Layout"),
        <>
          {prefs.profiles.map((profile, index) => (
            <Chip
              key={`${profile.from}-${profile.copy}`}
              label={profileName(profile)}
              on={prefs.current === index}
              onPress={() => onChange({ ...prefs, current: index })}
              palette={palette}
            />
          ))}
          <Chip
            label={t("Edit layout")}
            on={false}
            onPress={onEdit}
            palette={palette}
          />
        </>,
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
      <VarioSoundOptions
        unit={prefs.units.vario}
        chip={(key, label, on, onPress) => (
          <Chip key={key} label={label} on={on} onPress={onPress} palette={palette} />
        )}
        row={row}
        palette={palette}
      />
      <AirspaceOptions
        altitudeUnit={prefs.units.altitude}
        chip={(key, label, on, onPress) => (
          <Chip key={key} label={label} on={on} onPress={onPress} palette={palette} />
        )}
        row={row}
        palette={palette}
      />
      <Pressable
        accessibilityRole="button"
        onPress={onDone}
        style={[styles.done, { backgroundColor: palette.accent }]}
        testID="flight-options-done"
      >
        <Text style={[styles.doneText, { color: palette.onAccent }]}>{t("Done")}</Text>
      </Pressable>
    </ScrollView>
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
  render: (cell: Page[number], index: number, w: number, h: number) => React.ReactNode;
}) {
  const cellW = (width - GAP * (GRID_COLUMNS + 1)) / GRID_COLUMNS;
  const cellH = (height - GAP * (GRID_ROWS + 1)) / GRID_ROWS;
  return (
    <View style={{ width, height }}>
      {page.map((cell, index) => {
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
            {render(cell, index, w, h)}
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
  const sound = useVarioPrefs();
  const [prefs, setPrefs] = useState<FlightPrefs>(() => loadFlightPrefs(appUnits));
  const [choosing, setChoosing] = useState(false);
  const [locked, setLocked] = useState(false);
  const [hint, setHint] = useState(false);
  const [page, setPage] = useState(0);
  // The editor (part B2): open on the page and the widget held.
  const [editing, setEditing] = useState<{ page: number; index: number | null } | null>(
    null,
  );
  const [area, setArea] = useState({ width: 0, height: 0 });
  // The app has the provider; a screen tested alone does not.
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0 };
  const now = useNow(visible && live, TICK_MS);
  const at = live ? now : (track.fixes[track.fixes.length - 1]?.timeMs ?? now);
  const data = useFlightScreenData(track, at, takeoffMs, sharingLive);
  const palette = useMemo(() => paletteFor(prefs.look), [prefs.look]);
  const pages = pagesOf(prefs);
  const airspace = useAirspace();
  const alerts = useAirspaceAlerts();
  // The ground is read for a profile that shows it (A1), and for the
  // airspaces whose limits stand on it (E2).
  const showsGround =
    airspace !== null ||
    pages.some((one) => one.some((cell) => cell.widget === "aboveGround"));
  const here = track.fixes[track.fixes.length - 1]?.point ?? null;
  // The pilot against the airspaces of their file (E2), at every tick.
  const altM = data.instrument.altM;
  const groundM =
    altM !== null && data.aboveGroundM !== null ? altM - data.aboveGroundM : null;
  const near =
    airspace === null || here === null
      ? []
      : nearAirspaces(airspace.airspaces, here, altM, groundM);
  const alert = alertOf(near, alerts);
  // The volumes under the altitude chart (E3), when a page has one.
  const charted = pages.some((one) =>
    one.some((cell) => cell.widget === "altitudeChart"),
  );
  const bands: ProfileBand[][] =
    airspace === null || !charted
      ? []
      : profileBands(placeSeries(track, at), airspace.airspaces, groundM);
  const change = (next: FlightPrefs) => {
    setPrefs(next);
    saveFlightPrefs(next);
    if (next.current !== prefs.current) {
      setPage(0);
    }
  };
  /** The profile's units, with the widget's own where it has one. */
  const unitsOf = (cell: Page[number]): FlightUnits => {
    const kind = WIDGET_UNIT_KIND[cell.widget];
    return cell.unit === undefined || kind === undefined
      ? prefs.units
      : { ...prefs.units, [kind]: cell.unit };
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
              {`${profileName(prefs.profiles[prefs.current])} ▾`}
            </Text>
          </Pressable>
          {/* Within reach with the lock on too: the quick mute (part C). */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              sound.on ? t("Mute the vario") : t("Turn the vario sound on")
            }
            onPress={() => setVarioPrefs({ ...sound, on: !sound.on })}
            style={[styles.barButton, { borderColor: palette.borderStrong }]}
            testID="flight-screen-sound"
          >
            <Text style={[styles.barText, { color: palette.text }]}>
              {sound.on ? "🔊" : "🔇"}
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
        <AirspaceAlertLine
          alert={alert}
          units={appUnits}
          altitudeUnit={prefs.units.altitude}
          palette={palette}
        />
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
              key={prefs.current}
            >
              {pages.map((one, index) => (
                <PageView
                  key={index}
                  page={one}
                  width={area.width}
                  height={area.height}
                  render={(cell, cellIndex, w, h) => (
                    <Pressable
                      style={styles.held}
                      // A long press opens the editor on this widget (B2).
                      onLongPress={() => setEditing({ page: index, index: cellIndex })}
                      delayLongPress={EDIT_HOLD_MS}
                      testID={`flight-hold-${cell.widget}`}
                    >
                      {cell.widget === "map" ? (
                        <FlightMap
                          track={track}
                          takeoffMs={takeoffMs}
                          takeoff={data.instrument.takeoff?.point ?? null}
                          headingDeg={data.instrument.trackDeg}
                          circling={data.circling}
                          palette={palette}
                          height={h}
                          airspace={
                            airspace === null ? null : airspaceFeatures(near, groundM)
                          }
                        />
                      ) : (
                        <FlightWidget
                          widget={cell.widget}
                          nearest={near[0] ?? null}
                          bands={bands}
                          data={data}
                          flight={unitsOf(cell)}
                          units={appUnits}
                          palette={palette}
                          width={w}
                          height={h}
                        />
                      )}
                    </Pressable>
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
        {showsGround ? <GroundProbe here={here} nowMs={at} /> : null}
        {choosing ? (
          <Options
            prefs={prefs}
            onChange={change}
            onDone={() => setChoosing(false)}
            onEdit={() => {
              setChoosing(false);
              setEditing({ page, index: null });
            }}
            palette={palette}
            insets={{ top: insets.top, bottom: insets.bottom }}
          />
        ) : null}
        {editing !== null ? (
          <View
            style={[
              styles.editing,
              {
                backgroundColor: palette.background,
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
              },
            ]}
          >
            <FlightEditor
              prefs={prefs}
              onChange={change}
              onDone={() => {
                setEditing(null);
                setPage(0);
              }}
              palette={palette}
              startPage={editing.page}
              startIndex={editing.index}
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  held: { flex: 1 },
  editing: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
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
  },
  optionsInside: { padding: 20, paddingTop: 16, gap: 18 },
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
