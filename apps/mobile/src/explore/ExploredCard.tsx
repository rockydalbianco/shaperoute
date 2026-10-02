import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { RouteTiles } from "../route/RouteTiles";
import type { ExportState } from "../route/useGpxExport";
import { RunWithStrava } from "../strava/RunWithStrava";
import type { Explored } from "./explored";
import { ExploreStart } from "./ExploreStart";
import { cityName, routeTitle } from "./recommendedRoutes";
import type { StartView } from "./useStartDirections";

type Props = {
  explored: Explored;
  exporting: ExportState;
  onExport: () => void;
  onList: () => void;
  /** Turn-by-turn along it, the directions asked for first (TASK-145). */
  start: StartView;
  onStart: () => void;
};

/** Under the map: a route of "Explore", to run, look at and export (TASK-126). */
export function ExploredCard({
  explored,
  exporting,
  onExport,
  onList,
  start,
  onStart,
}: Props) {
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
      {/* A city's example with the API's alternatives: A · B · C (TASK-151). */}
      {explored.status === "done" && (
        <RouteTiles
          choices={explored.choices}
          chosen={explored.chosen}
          // The directions being asked for are those of the route chosen.
          onChoose={start.status === "loading" ? keepChoice : explored.choose}
        />
      )}
      {explored.status === "done" && <ExploreStart start={start} onStart={onStart} />}
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
      {/* Strava's official flow: a GPX imported there (TASK-135). */}
      {explored.status === "done" && (
        <RunWithStrava exporting={exporting} onExport={onExport} />
      )}
      <Pressable style={styles.secondary} onPress={onList} accessibilityRole="button">
        <Text style={styles.secondaryText}>Back to the list</Text>
      </Pressable>
    </View>
  );
}

function keepChoice(): void {}

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
