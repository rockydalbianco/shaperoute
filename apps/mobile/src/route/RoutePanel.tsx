import type { Shape } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { LONG_DISTANCE_KM, MAX_APP_DISTANCE_KM, MIN_DISTANCE_KM } from "./distance";
import { problemText } from "./problems";
import { shapeList } from "./shapeWords";
import type { ExportState } from "./useGpxExport";
import type { RouteProblem, RouteState } from "./useRouteRequest";

type Props = {
  /** The shape field as typed, and the shape it names (null: none). */
  shapeText: string;
  shape: Shape | null;
  onShapeText: (text: string) => void;
  /** The km field as typed, and what it means in metres (null: not valid). */
  distanceText: string;
  distanceM: number | null;
  onDistanceText: (text: string) => void;
  /** The state of the request for the current start, shape and distance. */
  view: RouteState;
  /** False without a start, a known shape and a valid distance. */
  canDraw: boolean;
  onDraw: () => void;
  onCancel: () => void;
  /** The GPX export of the route on screen. */
  exporting: ExportState;
  onExport: () => void;
};

export function RoutePanel({
  shapeText,
  shape,
  onShapeText,
  distanceText,
  distanceM,
  onDistanceText,
  view,
  canDraw,
  onDraw,
  onCancel,
  exporting,
  onExport,
}: Props) {
  const waiting = view.status === "waiting";
  return (
    <View style={styles.panel}>
      <View style={styles.row}>
        <TextInput
          style={[styles.field, styles.shape, waiting && styles.off]}
          value={shapeText}
          onChangeText={onShapeText}
          editable={!waiting}
          placeholder="heart, star, horse…"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          selectTextOnFocus
          accessibilityLabel="Shape"
        />
        <TextInput
          style={[styles.field, styles.km, waiting && styles.off]}
          value={distanceText}
          onChangeText={onDistanceText}
          editable={!waiting}
          keyboardType="decimal-pad"
          selectTextOnFocus
          accessibilityLabel="Distance in km"
        />
        <Text>km</Text>
      </View>
      {shape === null ? (
        <Text style={styles.problem}>{`Unknown shape. Try: ${shapeList()}.`}</Text>
      ) : (
        shapeText.trim().toLowerCase() !== shape && (
          <Text style={styles.note}>→ {shape}</Text>
        )
      )}
      {distanceM === null ? (
        <Text style={styles.problem}>
          {`Enter a distance between ${MIN_DISTANCE_KM} and ${MAX_APP_DISTANCE_KM} km.`}
        </Text>
      ) : (
        distanceM > LONG_DISTANCE_KM * 1000 && (
          <Text style={styles.note}>Long routes take longer: up to a few minutes.</Text>
        )
      )}
      {waiting ? (
        <View style={styles.row}>
          <Text style={styles.waiting}>
            {waitingText(view)} <Elapsed since={view.startedAt} />
          </Text>
          <Pressable
            style={styles.secondary}
            onPress={onCancel}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={[styles.draw, !canDraw && styles.off]}
          onPress={onDraw}
          disabled={!canDraw}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canDraw }}
        >
          <Text style={styles.drawText}>Draw route</Text>
        </Pressable>
      )}
      {view.status === "done" && (
        <View>
          <Text style={styles.result}>
            {(view.result.distance_m / 1000).toFixed(1)} km on roads (target{" "}
            {view.request.distance_m / 1000} km)
          </Text>
          {view.result.warnings.map((warning) => (
            <Text key={warning} style={styles.warning}>
              • {warning}
            </Text>
          ))}
          <Pressable
            style={[styles.secondary, styles.export]}
            onPress={onExport}
            disabled={exporting.status === "preparing"}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>
              {exporting.status === "preparing" ? "Preparing GPX…" : "Export GPX"}
            </Text>
          </Pressable>
          {exporting.status === "failed" && <Problem problem={exporting.problem} />}
        </View>
      )}
      {view.status === "failed" && <Problem problem={view.problem} />}
    </View>
  );
}

/** What the API is doing, as it said on its last answer. */
function waitingText({ phase, request }: Extract<RouteState, { status: "waiting" }>) {
  switch (phase) {
    case "sending":
    case "queued":
      return "Waiting for the API…";
    case "downloading_map":
      return "Downloading map data for this area…";
    default:
      return `Drawing a ${request.distance_m / 1000} km ${request.shape}…`;
  }
}

function Problem({ problem }: { problem: RouteProblem }) {
  const { text, detail } = problemText(problem);
  return (
    <View>
      <Text style={styles.problem}>{text}</Text>
      {detail && <Text style={styles.detail}>{detail}</Text>}
    </View>
  );
}

/** Seconds since `since`, updated every second while it is on screen. */
function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <Text>{Math.max(0, Math.floor((now - since) / 1000))} s</Text>;
}

const styles = StyleSheet.create({
  panel: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  field: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  shape: {
    flex: 1,
  },
  km: {
    width: 72,
  },
  note: {
    color: "#666",
  },
  draw: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#d6336c",
  },
  off: {
    opacity: 0.4,
  },
  drawText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  waiting: {
    flex: 1,
    color: "#333",
  },
  secondary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#999",
  },
  secondaryText: {
    fontWeight: "bold",
  },
  export: {
    alignSelf: "flex-start",
    marginTop: 8,
  },
  result: {
    fontWeight: "bold",
  },
  warning: {
    color: "#666",
    fontSize: 13,
  },
  problem: {
    color: "#b42318",
  },
  detail: {
    color: "#666",
    fontSize: 12,
  },
});
