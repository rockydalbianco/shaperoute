import type { LatLon } from "@shaperoute/shared-types";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

import { t } from "../i18n";
import { useLanguage } from "../i18n/useLanguage";
import type { Track } from "../navigation/trackRecorder";
import { fontWeight, type Palette } from "../theme/tokens";
import { courseOf, varioPieces } from "./flightMapData";
import { buildFlightMapPage, parseFlightMapMessage } from "./flightMapPage";
import { setFlightMapPrefs, useFlightMapPrefs } from "./flightMapPrefs";

/**
 * The «Map» widget of the flight screen (TASK-479 part A1, ADR-0388): the
 * flight map page in a WebView, told the pilot's place at most once a
 * second and the coloured track once every 5 s, so the phone does not
 * spend itself on the map. Two buttons on it, when it is tall enough:
 * «3D»/«2D» and the way it turns, heading up or north up; the choice is
 * kept and is every map widget's. The airspaces of the pilot's file near
 * them go with the track (part E2).
 */

/** The pilot's place goes to the page at most this often, ms. */
export const PILOT_EVERY_MS = 1_000;
/** The track goes to the page at most this often, ms. */
export const TRACK_EVERY_MS = 5_000;
/** Under this height the widget has no buttons, only the map. */
export const BUTTONS_MIN_HEIGHT = 160;
const BUTTON = 64;

let lastFps: number | null = null;

/** The last frames a second a flight map drew, for the measures of A1. */
export function flightMapFps(): number | null {
  return lastFps;
}

type Props = {
  track: Track;
  takeoffMs: number | null;
  takeoff: LatLon | null;
  /** Degrees from north the pilot goes now, null when not known. */
  headingDeg: number | null;
  circling: boolean;
  palette: Palette;
  height: number;
  /** The pilot's airspaces near them, as the page draws them (part E2);
   * null without a file. Sent with the track. */
  airspace?: unknown;
  /** The pilot's task, as the page draws it (part D2); null without one. */
  task?: unknown;
};

function call(view: WebView | null, script: string): void {
  view?.injectJavaScript(`if (window.flight) { ${script} } true;`);
}

export function FlightMap({
  track,
  takeoffMs,
  takeoff,
  headingDeg,
  circling,
  palette,
  height,
  airspace = null,
  task = null,
}: Props) {
  const language = useLanguage();
  const page = useMemo(
    () => buildFlightMapPage(palette, language),
    [palette, language],
  );
  const prefs = useFlightMapPrefs();
  const view = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const course = useRef<number | null>(null);
  const pilotAt = useRef(0);
  const trackAt = useRef(0);
  const last = track.fixes[track.fixes.length - 1] ?? null;

  // The view, at once and again on every change.
  useEffect(() => {
    if (ready) {
      call(view.current, `window.flight.setView(${prefs.threeD}, ${prefs.headingUp});`);
    }
  }, [ready, prefs.threeD, prefs.headingUp]);

  useEffect(() => {
    if (ready) {
      call(
        view.current,
        takeoff === null
          ? "window.flight.setTakeoff(null, null);"
          : `window.flight.setTakeoff(${takeoff[0]}, ${takeoff[1]});`,
      );
    }
  }, [ready, takeoff]);

  // The pilot and the track, at most as often as said; at once once ready.
  useEffect(() => {
    if (!ready || last === null) {
      return;
    }
    const nowMs = last.timeMs;
    if (nowMs - pilotAt.current >= PILOT_EVERY_MS) {
      pilotAt.current = nowMs;
      course.current = courseOf(track, circling, course.current);
      call(
        view.current,
        `window.flight.setPilot(${last.point[0]}, ${last.point[1]}, ${headingDeg}, ${course.current});`,
      );
    }
    if (nowMs - trackAt.current >= TRACK_EVERY_MS) {
      trackAt.current = nowMs;
      const features = varioPieces(track, takeoffMs).map((piece) => ({
        type: "Feature",
        properties: { v: piece.climbMps },
        geometry: { type: "LineString", coordinates: piece.line },
      }));
      call(
        view.current,
        `window.flight.setTrack(${JSON.stringify({ type: "FeatureCollection", features })});`,
      );
      call(
        view.current,
        `window.flight.setAirspace(${JSON.stringify(
          airspace ?? { type: "FeatureCollection", features: [] },
        )});`,
      );
      call(
        view.current,
        `window.flight.setTask(${JSON.stringify(
          task ?? { type: "FeatureCollection", features: [] },
        )});`,
      );
    }
  }, [ready, last, track, takeoffMs, headingDeg, circling, airspace, task]);

  const buttons = height >= BUTTONS_MIN_HEIGHT;
  const button = [
    styles.button,
    { backgroundColor: palette.surfaceRaised, borderColor: palette.borderStrong },
  ];
  return (
    <View style={[styles.box, { borderColor: palette.border }]} testID="flight-map">
      <WebView
        ref={view}
        style={[styles.page, { backgroundColor: palette.map.background }]}
        source={{ html: page }}
        originWhitelist={["*"]}
        scrollEnabled={false}
        onLoadStart={() => {
          setReady(false);
          setLoaded(false);
          pilotAt.current = 0;
          trackAt.current = 0;
        }}
        onMessage={(event) => {
          const message = parseFlightMapMessage(event.nativeEvent.data);
          if (message?.type === "ready") {
            setReady(true);
          } else if (message?.type === "loaded") {
            setLoaded(true);
          } else if (message?.type === "fps") {
            lastFps = message.fps;
          }
        }}
      />
      {loaded ? null : (
        <View
          style={[styles.cover, { backgroundColor: palette.surface }]}
          pointerEvents="none"
        >
          <Text style={[styles.coverText, { color: palette.textMuted }]}>
            {t("Map")}
          </Text>
        </View>
      )}
      {buttons ? (
        <View style={styles.buttons}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={prefs.threeD ? "2D" : "3D"}
            onPress={() => setFlightMapPrefs({ ...prefs, threeD: !prefs.threeD })}
            style={button}
            testID="flight-map-kind"
          >
            <Text style={[styles.buttonText, { color: palette.text }]}>
              {prefs.threeD ? "3D" : "2D"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={prefs.headingUp ? t("North up") : t("Heading up")}
            onPress={() => setFlightMapPrefs({ ...prefs, headingUp: !prefs.headingUp })}
            style={button}
            testID="flight-map-turn"
          >
            <Text style={[styles.buttonText, { color: palette.text }]}>
              {prefs.headingUp ? "▲" : "N"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, borderRadius: 14, borderWidth: 2, overflow: "hidden" },
  page: { flex: 1 },
  cover: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  coverText: { fontSize: 18, fontWeight: fontWeight.semibold },
  buttons: { position: "absolute", right: 8, top: 8, gap: 8 },
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 18, fontWeight: fontWeight.bold },
});
