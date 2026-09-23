import { type Shape, SHAPES } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { problemText } from "./problems";
import type { RouteState } from "./useRouteRequest";

/**
 * The distances offered for now: the ones with known times (ADR-0031).
 * Free fields for any distance and shape come later (ROADMAP, phase 2).
 */
export const DISTANCES_KM = [3, 5, 10, 15] as const;
export type DistanceKm = (typeof DISTANCES_KM)[number];

type Props = {
  shape: Shape;
  distanceKm: DistanceKm;
  onShape: (shape: Shape) => void;
  onDistance: (distanceKm: DistanceKm) => void;
  /** The state of the request for the current start, shape and distance. */
  view: RouteState;
  /** False without a start. */
  canDraw: boolean;
  onDraw: () => void;
  onCancel: () => void;
};

export function RoutePanel({
  shape,
  distanceKm,
  onShape,
  onDistance,
  view,
  canDraw,
  onDraw,
  onCancel,
}: Props) {
  const waiting = view.status === "waiting";
  return (
    <View style={styles.panel}>
      <View style={styles.row}>
        {SHAPES.map((option) => (
          <Choice
            key={option}
            label={option}
            selected={option === shape}
            disabled={waiting}
            onPress={() => onShape(option)}
          />
        ))}
      </View>
      <View style={styles.row}>
        {DISTANCES_KM.map((option) => (
          <Choice
            key={option}
            label={`${option} km`}
            selected={option === distanceKm}
            disabled={waiting}
            onPress={() => onDistance(option)}
          />
        ))}
      </View>
      {waiting ? (
        <View style={styles.row}>
          <Text style={styles.waiting}>
            Drawing a {distanceKm} km {shape}… <Elapsed since={view.startedAt} />
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
        </View>
      )}
      {view.status === "failed" && <Problem view={view} />}
    </View>
  );
}

function Problem({ view }: { view: Extract<RouteState, { status: "failed" }> }) {
  const { text, detail } = problemText(view.problem);
  return (
    <View>
      <Text style={styles.problem}>{text}</Text>
      {detail && <Text style={styles.detail}>{detail}</Text>}
    </View>
  );
}

function Choice({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.choice, selected && styles.selected]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
    >
      <Text style={selected ? styles.selectedText : undefined}>{label}</Text>
    </Pressable>
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
  choice: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  selected: {
    backgroundColor: "#1f6feb",
    borderColor: "#1f6feb",
  },
  selectedText: {
    color: "#fff",
    fontWeight: "bold",
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
