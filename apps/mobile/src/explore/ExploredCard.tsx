import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import type { ExportState } from "../route/useGpxExport";
import type { Explored } from "./explored";
import { cityName, routeTitle } from "./recommendedRoutes";

type Props = {
  explored: Explored;
  exporting: ExportState;
  onExport: () => void;
  onList: () => void;
};

/** Under the map: a route of "Explore", to look at and export (TASK-126). */
export function ExploredCard({ explored, exporting, onExport, onList }: Props) {
  const { route } = explored;
  const title = routeTitle(route);
  return (
    <View style={styles.panel}>
      <View>
        <Text style={styles.result}>{`${(route.route_m / 1000).toFixed(1)} km`}</Text>
        <Text style={styles.target}>
          {`${title} · ${cityName(route.city)} · looks ${Math.round(route.similarity * 100)}% like it`}
        </Text>
      </View>
      {explored.status === "loading" && (
        <Text style={styles.target}>Loading the route…</Text>
      )}
      {explored.status === "failed" && (
        <Text style={styles.error}>The route could not load. Try again.</Text>
      )}
      {explored.status === "done" && (
        <Pressable
          style={styles.secondary}
          onPress={onExport}
          disabled={exporting.status === "preparing"}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>
            {exporting.status === "preparing" ? "Preparing GPX…" : "Export GPX"}
          </Text>
        </Pressable>
      )}
      {exporting.status === "failed" && (
        <Text style={styles.error}>The GPX could not be made. Try again.</Text>
      )}
      <Pressable style={styles.secondary} onPress={onList} accessibilityRole="button">
        <Text style={styles.secondaryText}>Back to the list</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: space.md,
  },
  result: {
    color: color.text,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
  },
  target: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  error: {
    color: color.error,
    fontSize: fontSize.small,
  },
  secondary: {
    minHeight: MIN_TAP_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  secondaryText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
