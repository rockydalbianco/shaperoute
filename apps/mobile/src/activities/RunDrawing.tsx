import type { LatLon } from "@shaperoute/shared-types";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { color, radius, route as routeLine, space, track } from "../theme/tokens";
import { fitLines, type Segment } from "./fitLines";

/** The route under the run, thicker: its yellow shows on both sides. */
const ROUTE_WIDTH = 4;

type Props = {
  /** The planned route; null for a run without one. */
  route: LatLon[] | null;
  /** What was run. */
  track: LatLon[];
  width: number;
  height: number;
};

const NO_ROUTE: LatLon[] = [];

/**
 * A run as the end of a run shows it on the map, small (TASK-172): the
 * route yellow, and over it, thin and light, what was run. No SVG in the
 * app: each segment is a thin turned View.
 */
export function RunDrawing({ route, track: run, width, height }: Props) {
  const [planned, done] = useMemo(
    () => fitLines([route ?? NO_ROUTE, run], width, height, space.sm),
    [route, run, width, height],
  );
  return (
    <View style={[styles.box, { width, height }]} accessible={false}>
      {planned.map((s, i) => (
        <View
          key={`route-${i}`}
          testID="run-drawing-route"
          style={[styles.route, placed(s, ROUTE_WIDTH)]}
        />
      ))}
      {done.map((s, i) => (
        <View
          key={`track-${i}`}
          testID="run-drawing-track"
          style={[styles.track, placed(s, track.width)]}
        />
      ))}
    </View>
  );
}

function placed(s: Segment, thickness: number) {
  return {
    left: s.left,
    top: s.top - thickness / 2,
    width: s.length + thickness / 2,
    transform: [{ rotate: `${s.angle}deg` }],
  };
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.md,
    backgroundColor: color.map.background,
    overflow: "hidden",
  },
  route: {
    position: "absolute",
    height: ROUTE_WIDTH,
    borderRadius: ROUTE_WIDTH / 2,
    backgroundColor: routeLine.color,
  },
  track: {
    position: "absolute",
    height: track.width,
    borderRadius: track.width / 2,
    backgroundColor: track.color,
    opacity: track.opacity,
  },
});
