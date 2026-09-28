import type { OutlinePoint } from "@shaperoute/shared-types";
import { useRef, useState } from "react";
import { type GestureResponderEvent, Image, StyleSheet, View } from "react-native";

import { color, radius } from "../theme/tokens";
import { MIN_STEP_SHARE, shareOf, thinLine } from "./drawnLine";
import type { Picture } from "./pickImage";

/** The line of the outline, in points: thick enough to read at a glance. */
const LINE = 3;
/** The line under the finger, thinner: it is not the outline yet. */
const DRAWN_LINE = 2;
/** A tall picture is kept this high, so the distance stays in view. */
export const MAX_PREVIEW_HEIGHT = 320;

/** One side of the outline, as a box turned along it. */
export type Segment = { left: number; top: number; length: number; angle: number };

/**
 * The sides of an outline given as shares of a box (image_points), in
 * points of a box `width` × `height`: each a thin box centred on the side
 * and turned by its angle. No SVG: the app has no library for it.
 */
export function segmentsOf(
  points: OutlinePoint[],
  width: number,
  height: number,
  line: number = LINE,
): Segment[] {
  const segments: Segment[] = [];
  for (let i = 1; i < points.length; i += 1) {
    const [x1, y1] = [points[i - 1][0] * width, points[i - 1][1] * height];
    const [x2, y2] = [points[i][0] * width, points[i][1] * height];
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (length === 0) {
      continue;
    }
    segments.push({
      // Overlapping by the line's width, so the corners have no gaps.
      left: (x1 + x2) / 2 - (length + line) / 2,
      top: (y1 + y2) / 2 - line / 2,
      length: length + line,
      angle: Math.atan2(y2 - y1, x2 - x1),
    });
  }
  return segments;
}

/**
 * The outline the engine traced, drawn in the route's yellow over the
 * picture it came from (TASK-073). The picture is dimmed: the line is what
 * the route will draw, and what did not become line (a piece left out, a
 * detail smoothed away) stays visible under it. `showPicture` false leaves
 * the line alone, as it will look on the map.
 *
 * The details drawn by hand (TASK-079) are drawn like the outline. With
 * `onDraw`, a finger draws on the picture: the line follows it, and when it
 * lifts the line goes to `onDraw`, as shares of the picture.
 */
export function ImagePreview({
  picture,
  points,
  strokes = [],
  aspect,
  showPicture = true,
  onDraw,
}: {
  picture: Picture;
  points: OutlinePoint[];
  strokes?: OutlinePoint[][];
  aspect: number;
  showPicture?: boolean;
  onDraw?: (line: OutlinePoint[]) => void;
}) {
  // The room across, measured; then the largest box of the picture's
  // proportions that fits it and MAX_PREVIEW_HEIGHT.
  const [room, setRoom] = useState(0);
  const width = Math.min(room, MAX_PREVIEW_HEIGHT * aspect);
  const height = width / aspect;
  // The line under the finger: in a ref for the touches, in state to show.
  const line = useRef<OutlinePoint[]>([]);
  const [drawn, setDrawn] = useState<OutlinePoint[]>([]);
  const follow = (points: OutlinePoint[]) => {
    line.current = points;
    setDrawn(points);
  };
  const at = (event: GestureResponderEvent) =>
    shareOf(event.nativeEvent.locationX, event.nativeEvent.locationY, width, height);
  // The frame takes the touches, and its children none: a touch's location
  // is then always in the frame's own points.
  const drawing = onDraw && width > 0;
  const touches = drawing
    ? {
        onStartShouldSetResponder: () => true,
        onMoveShouldSetResponder: () => true,
        // The panel must not scroll away with the finger.
        onResponderTerminationRequest: () => false,
        onResponderGrant: (event: GestureResponderEvent) => follow([at(event)]),
        onResponderMove: (event: GestureResponderEvent) =>
          follow([...line.current, at(event)]),
        onResponderRelease: () => {
          const done = line.current;
          follow([]);
          if (done.length >= 2) {
            onDraw(thinLine(done, MIN_STEP_SHARE));
          }
        },
        onResponderTerminate: () => follow([]),
      }
    : {};
  return (
    <View
      style={styles.room}
      onLayout={(event) => setRoom(event.nativeEvent.layout.width)}
      testID="image-preview"
    >
      <View
        style={[styles.frame, { width, height }]}
        accessibilityRole="image"
        accessibilityLabel="The outline traced from the picture"
        testID="preview-frame"
        {...touches}
      >
        {showPicture && (
          // The frame has the picture's own proportions: stretching is exact.
          <Image
            source={{ uri: picture.uri }}
            style={styles.picture}
            resizeMode="stretch"
            testID="preview-picture"
          />
        )}
        {width > 0 && (
          <>
            <Sides segments={segmentsOf(points, width, height)} testID="outline-side" />
            {strokes.map((stroke, index) => (
              <Sides
                key={index}
                segments={segmentsOf(stroke, width, height)}
                testID="detail-side"
              />
            ))}
            <Sides
              segments={segmentsOf(drawn, width, height, DRAWN_LINE)}
              testID="drawn-side"
              thin
            />
          </>
        )}
      </View>
    </View>
  );
}

/** Sides of a line, each a thin box turned along it; they take no touches. */
function Sides({
  segments,
  testID,
  thin = false,
}: {
  segments: Segment[];
  testID: string;
  thin?: boolean;
}) {
  return segments.map((segment, index) => (
    <View
      key={index}
      testID={testID}
      pointerEvents="none"
      style={[
        styles.side,
        thin && styles.drawn,
        {
          left: segment.left,
          top: segment.top,
          width: segment.length,
          transform: [{ rotate: `${segment.angle}rad` }],
        },
      ]}
    />
  ));
}

const styles = StyleSheet.create({
  room: {
    width: "100%",
    alignItems: "center",
  },
  frame: {
    overflow: "hidden",
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
  picture: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.35,
    pointerEvents: "none",
  },
  side: {
    position: "absolute",
    height: LINE,
    borderRadius: LINE / 2,
    backgroundColor: color.accent,
  },
  drawn: {
    height: DRAWN_LINE,
    borderRadius: DRAWN_LINE / 2,
    opacity: 0.7,
  },
});
