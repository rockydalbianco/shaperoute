import { type LatLon, SHAPES } from "@shaperoute/shared-types";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  type PositionState,
  useCurrentPosition,
} from "./src/location/useCurrentPosition";
import { MapView } from "./src/map/MapView";
import { PlaceSearch } from "./src/places/PlaceSearch";
import type { Place } from "./src/places/photon";

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

  return (
    <View style={styles.screen}>
      <View style={[styles.panel, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>ShapeRoute</Text>
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
      <MapView style={styles.map} start={start?.point ?? null} onError={setMapError} />
      <View style={[styles.panel, styles.bottom, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable style={styles.button} onPress={refresh} accessibilityRole="button">
          <Text style={styles.buttonText}>My position</Text>
        </Pressable>
        <View style={styles.shapes}>
          <Text style={styles.label}>Shapes</Text>
          {SHAPES.map((shape) => (
            <Text key={shape} style={styles.shape}>
              {shape}
            </Text>
          ))}
        </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  shapes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: "#666",
  },
  shape: {
    fontSize: 16,
  },
});
