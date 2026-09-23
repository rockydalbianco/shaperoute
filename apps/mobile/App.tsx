import type { LatLon, RouteRequest, Shape } from "@shaperoute/shared-types";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import { apiUrl } from "./src/api/apiUrl";
import {
  type PositionState,
  useCurrentPosition,
} from "./src/location/useCurrentPosition";
import { MapView } from "./src/map/MapView";
import { PlaceSearch } from "./src/places/PlaceSearch";
import type { Place } from "./src/places/photon";
import { type DistanceKm, RoutePanel } from "./src/route/RoutePanel";
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
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

function MapScreen() {
  const insets = useSafeAreaInsets();
  const { position, refresh } = useCurrentPosition();
  const [place, setPlace] = useState<Place | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [shape, setShape] = useState<Shape>("heart");
  const [distanceKm, setDistanceKm] = useState<DistanceKm>(5);
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

  const request: RouteRequest | null = start && {
    start: start.point,
    shape,
    distance_m: distanceKm * 1000,
    activity: "running",
  };
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
    <View style={styles.screen}>
      <View style={[styles.panel, { paddingTop: insets.top + 8 }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>ShapeRoute</Text>
          <Pressable style={styles.button} onPress={refresh} accessibilityRole="button">
            <Text style={styles.buttonText}>My position</Text>
          </Pressable>
        </View>
        <Text style={styles.status}>{statusText(position, start)}</Text>
        {position.status === "denied" && (
          <Pressable
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
      <View style={[styles.panel, styles.bottom, { paddingBottom: insets.bottom + 8 }]}>
        <RoutePanel
          shape={shape}
          distanceKm={distanceKm}
          onShape={setShape}
          onDistance={setDistanceKm}
          view={view}
          canDraw={request !== null}
          onDraw={() => request && draw(request)}
          onCancel={cancel}
          exporting={exporting}
          onExport={() => {
            if (view.status === "done") {
              gpx.exportGpx(view.request, view.result);
            }
          }}
        />
      </View>
    </View>
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
    backgroundColor: "#fff",
  },
  panel: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  status: {
    marginTop: 4,
    color: "#333",
  },
  link: {
    marginTop: 4,
    color: "#1f6feb",
    fontWeight: "bold",
  },
  error: {
    marginTop: 8,
    color: "#b42318",
  },
  map: {
    flex: 1,
  },
  bottom: {
    paddingTop: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#1f6feb",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
