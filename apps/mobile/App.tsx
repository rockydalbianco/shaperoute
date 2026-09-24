import type { LatLon, RouteRequest } from "@shaperoute/shared-types";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import { apiUrl } from "./src/api/apiUrl";
import {
  type PositionState,
  useCurrentPosition,
} from "./src/location/useCurrentPosition";
import { MapView } from "./src/map/MapView";
import { PlaceSearch } from "./src/places/PlaceSearch";
import type { Place } from "./src/places/photon";
import { toDistanceM } from "./src/route/distance";
import { RoutePanel } from "./src/route/RoutePanel";
import { toShape } from "./src/route/shapeWords";
import { useShapeReading } from "./src/route/useShapeReading";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "./src/theme/tokens";
import { type ExportState, useGpxExport } from "./src/route/useGpxExport";
import {
  type RouteState,
  sameRequest,
  useRouteRequest,
} from "./src/route/useRouteRequest";

/** The API on the PC that serves the app (ADR-0031); null if unknown. */
const API_URL = apiUrl();

/** Where the route will start: the GPS position, or a place searched for. */
type Start =
  { point: LatLon; source: "gps" } | { point: LatLon; source: "search"; label: string };

export default function App() {
  return (
    <SafeAreaProvider>
      <MapScreen />
      {/* The app is dark: light status bar text on any phone setting. */}
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

function MapScreen() {
  const insets = useSafeAreaInsets();
  const { position, refresh } = useCurrentPosition();
  const [place, setPlace] = useState<Place | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [shapeText, setShapeText] = useState("heart");
  const tableShape = toShape(shapeText);
  const shapeReading = useShapeReading(API_URL);
  // The table first; the AI only for other words (ADR-0012).
  const reading =
    tableShape === null && shapeText.trim() !== ""
      ? shapeReading.stateOf(shapeText)
      : null;
  const shape = tableShape ?? (reading?.status === "read" ? reading.shape : null);
  const [distanceText, setDistanceText] = useState("5");
  const distanceM = toDistanceM(distanceText);
  const { state, draw, cancel } = useRouteRequest(API_URL);
  const gpx = useGpxExport(API_URL);

  // The GPS wins as soon as it answers, also over a place searched before.
  const start = useMemo<Start | null>(() => {
    if (position.status === "ok") {
      return { point: position.point, source: "gps" };
    }
    if (place) {
      return { point: place.point, source: "search", label: place.label };
    }
    return null;
  }, [position, place]);

  const noPosition = position.status === "denied" || position.status === "unavailable";

  const request: RouteRequest | null =
    start && shape !== null && distanceM !== null
      ? { start: start.point, shape, distance_m: distanceM, activity: "running" }
      : null;
  // A new start, shape or distance leaves the last answer behind.
  const view: RouteState =
    request && state.status !== "idle" && sameRequest(state.request, request)
      ? state
      : { status: "idle" };
  // The export state of another route does not belong on screen.
  const exporting: ExportState =
    view.status === "done" &&
    gpx.state.status !== "idle" &&
    gpx.state.result === view.result
      ? gpx.state
      : { status: "idle" };

  return (
    // The km field sits at the bottom: the map shrinks so the keyboard does
    // not cover it.
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.panel, { paddingTop: insets.top + space.sm }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>ShapeRoute</Text>
          <Pressable style={styles.button} onPress={refresh} accessibilityRole="button">
            <Text style={styles.buttonText}>My position</Text>
          </Pressable>
        </View>
        <Text style={styles.status}>{statusText(position, start)}</Text>
        {position.status === "denied" && (
          <Pressable
            style={styles.linkButton}
            onPress={() => void Linking.openSettings()}
            accessibilityRole="button"
          >
            <Text style={styles.link}>Open Settings</Text>
          </Pressable>
        )}
        {noPosition && <PlaceSearch onSelect={setPlace} />}
        {mapError && (
          <Text style={styles.error}>
            The map could not load ({mapError}). Check the connection and reopen the
            app.
          </Text>
        )}
      </View>
      <MapView
        style={styles.map}
        start={start?.point ?? null}
        route={view.status === "done" ? view.result.points : null}
        onError={setMapError}
      />
      <View
        style={[
          styles.panel,
          styles.bottom,
          { paddingBottom: insets.bottom + space.sm },
        ]}
      >
        <RoutePanel
          shapeText={shapeText}
          shape={shape}
          onShapeText={setShapeText}
          reading={reading}
          onShapeDone={() => {
            if (reading) {
              shapeReading.read(shapeText);
            }
          }}
          distanceText={distanceText}
          distanceM={distanceM}
          onDistanceText={setDistanceText}
          view={view}
          canDraw={request !== null}
          onDraw={() => {
            // The decimal pad has no return key: drawing closes it.
            Keyboard.dismiss();
            if (request) {
              draw(request);
            }
          }}
          onCancel={cancel}
          onTryDistance={(distance_m) => {
            setDistanceText(String(distance_m / 1000));
            if (request) {
              draw({ ...request, distance_m });
            }
          }}
          onPickShape={setShapeText}
          exporting={exporting}
          onExport={() => {
            if (view.status === "done") {
              gpx.exportGpx(view.request, view.result);
            }
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function statusText(position: PositionState, start: Start | null): string {
  if (start?.source === "gps") {
    return "Starting from your position.";
  }
  if (start?.source === "search") {
    return `Starting from ${start.label}.`;
  }
  switch (position.status) {
    case "denied":
      return "Location is off for ShapeRoute. Allow it in Settings, or search for a place to start from.";
    case "unavailable":
      return "Your position is not available right now. Search for a place to start from.";
    default:
      return "Finding your position…";
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.background,
  },
  panel: {
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  status: {
    marginTop: space.xs,
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  linkButton: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  // Not yellow: that is the route's. Underlined, so it still reads as a link.
  link: {
    color: color.text,
    fontWeight: fontWeight.bold,
    textDecorationLine: "underline",
  },
  error: {
    marginTop: space.sm,
    color: color.error,
  },
  map: {
    flex: 1,
    // Under the page while the WebView starts, so it never flashes white.
    backgroundColor: color.map.background,
  },
  bottom: {
    paddingTop: space.sm,
  },
  // A secondary control: the yellow belongs to "Draw route" alone.
  button: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  buttonText: {
    color: color.text,
    fontWeight: fontWeight.bold,
  },
});
