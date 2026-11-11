import type { OutlinePoint } from "@shaperoute/shared-types";
import { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Easing,
  type LayoutChangeEvent,
  StyleSheet,
  View,
} from "react-native";

import type { AnyRouteRequest } from "../api/routes";
import { route as routeLine, shapeGhost } from "../theme/tokens";
import { useReduceMotion } from "../ui/useReduceMotion";
import { segmentsOf } from "./ImagePreview";
import { waitingOutline } from "./waitingOutline";

/** The side of the shape at most, in points, and its share of the smaller
 * side of the map it is shown over. */
export const GHOST_MAX_SIZE = 240;
export const GHOST_SHARE = 0.6;

/** Where the dot is along a line: `at` from 0 to 1 by the length run, and
 * the point there, in points of the box. */
export type PenPath = { at: number[]; x: number[]; y: number[] };

/**
 * The way of the dot round `points` (shares of a box `size` wide), at an
 * even pace: the corners with the share of the length run at each. Points
 * that repeat the one before are left out, so `at` only grows; a line with
 * no length has no way.
 */
export function penPath(points: readonly OutlinePoint[], size: number): PenPath | null {
  const corners: { x: number; y: number; run: number }[] = [];
  for (const [px, py] of points) {
    const [x, y] = [px * size, py * size];
    const last = corners[corners.length - 1];
    if (last === undefined) {
      corners.push({ x, y, run: 0 });
      continue;
    }
    const step = Math.hypot(x - last.x, y - last.y);
    if (step > 0) {
      corners.push({ x, y, run: last.run + step });
    }
  }
  const length = corners[corners.length - 1]?.run ?? 0;
  if (corners.length < 2 || length === 0) {
    return null;
  }
  return {
    at: corners.map(({ run }) => run / length),
    x: corners.map(({ x }) => x),
    y: corners.map(({ y }) => y),
  };
}

/** The side of the shape over a map `width` × `height`. */
export function ghostSize(width: number, height: number): number {
  return Math.min(GHOST_MAX_SIZE, Math.floor(Math.min(width, height) * GHOST_SHARE));
}

type Props = {
  /** The outline and its details, as shares of a square box, y down. */
  lines: OutlinePoint[][];
};

/**
 * The shape asked for, over the map while its route is drawn (TASK-442): in
 * the middle of the map, not at a place on it, since the search has not
 * placed it yet. It breathes between two opacities and a dot in the route's
 * yellow goes round its outline, as a pen would. With «Reduce Motion» it
 * keeps still, with no dot. It takes no touches and says nothing to a
 * screen reader: the bar under the map already says what is drawn.
 */
export function ShapeGhost({ lines }: Props) {
  const still = useReduceMotion();
  const [size, setSize] = useState(0);
  const [breath] = useState(() => new Animated.Value(0));
  const [lap] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (still) {
      breath.setValue(1);
      lap.setValue(0);
      return;
    }
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: shapeGhost.breathMs,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: shapeGhost.breathMs,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    const going = Animated.loop(
      Animated.timing(lap, {
        toValue: 1,
        duration: shapeGhost.lapMs,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    breathing.start();
    going.start();
    return () => {
      breathing.stop();
      going.stop();
    };
  }, [still, breath, lap]);

  const sides = useMemo(
    () =>
      size === 0
        ? []
        : lines.flatMap((line) => segmentsOf(line, size, size, shapeGhost.waitWidth)),
    [lines, size],
  );
  const path = useMemo(
    () => (size === 0 || lines.length === 0 ? null : penPath(lines[0], size)),
    [lines, size],
  );

  const onLayout = ({ nativeEvent }: LayoutChangeEvent) =>
    setSize(ghostSize(nativeEvent.layout.width, nativeEvent.layout.height));

  const opacity = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [shapeGhost.waitDim, shapeGhost.waitBright],
  });
  return (
    <View
      style={styles.over}
      pointerEvents="none"
      onLayout={onLayout}
      testID="shape-ghost"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {size > 0 && (
        <View style={{ width: size, height: size }}>
          <Animated.View
            style={[StyleSheet.absoluteFill, { opacity }]}
            testID="shape-ghost-outline"
          >
            {sides.map((side, index) => (
              <View
                key={index}
                testID="shape-ghost-side"
                style={[
                  styles.side,
                  {
                    left: side.left,
                    top: side.top,
                    width: side.length,
                    transform: [{ rotate: `${side.angle}rad` }],
                  },
                ]}
              />
            ))}
          </Animated.View>
          {!still && path !== null && (
            <Animated.View
              testID="shape-ghost-pen"
              style={[
                styles.pen,
                {
                  transform: [
                    {
                      translateX: lap.interpolate({
                        inputRange: path.at,
                        outputRange: path.x,
                      }),
                    },
                    {
                      translateY: lap.interpolate({
                        inputRange: path.at,
                        outputRange: path.y,
                      }),
                    },
                  ],
                },
              ]}
            />
          )}
        </View>
      )}
    </View>
  );
}

/**
 * `ShapeGhost` for a request being drawn: the outline the app has for it
 * (`waitingOutline`), or nothing, as for a word.
 */
export function WaitingShape({ request }: { request: AnyRouteRequest }) {
  const lines = useMemo(() => waitingOutline(request), [request]);
  return lines === null ? null : <ShapeGhost lines={lines} />;
}

const styles = StyleSheet.create({
  // Over the whole map, the shape in its middle.
  over: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  side: {
    position: "absolute",
    height: shapeGhost.waitWidth,
    borderRadius: shapeGhost.waitWidth / 2,
    backgroundColor: shapeGhost.color,
  },
  // Centred on the box's corner, then moved along the outline.
  pen: {
    position: "absolute",
    left: -shapeGhost.pen / 2,
    top: -shapeGhost.pen / 2,
    width: shapeGhost.pen,
    height: shapeGhost.pen,
    borderRadius: shapeGhost.pen / 2,
    backgroundColor: routeLine.color,
  },
});
