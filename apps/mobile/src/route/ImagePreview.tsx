import type { OutlinePoint } from "@shaperoute/shared-types";
import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import { t } from "../i18n";
import { color, radius } from "../theme/tokens";
import type { Picture } from "./pickImage";

/** The line of the outline, in points: thick enough to read at a glance. */
export const LINE = 3;
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
 * the line alone, as it will look on the map. The details drawn by hand
 * (TASK-079) are drawn like the outline; drawing happens on the full-screen
 * board (OutlineBoard), not here, where the page scrolls.
 */
export function ImagePreview({
  picture,
  points,
  strokes = [],
  aspect,
  showPicture = true,
}: {
  picture: Picture;
  points: OutlinePoint[];
  strokes?: OutlinePoint[][];
  aspect: number;
  showPicture?: boolean;
}) {
  // The room across, measured; then the largest box of the picture's
  // proportions that fits it and MAX_PREVIEW_HEIGHT.
  const [room, setRoom] = useState(0);
  const width = Math.min(room, MAX_PREVIEW_HEIGHT * aspect);
  const height = width / aspect;
  return (
    <View
      style={styles.room}
      onLayout={(event) => setRoom(event.nativeEvent.layout.width)}
      testID="image-preview"
    >
      <View
        style={[styles.frame, { width, height }]}
        accessibilityRole="image"
        accessibilityLabel={t("The outline traced from the picture")}
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
          <OutlineLines
            points={points}
            strokes={strokes}
            width={width}
            height={height}
          />
        )}
      </View>
    </View>
  );
}

/** The outline and its details over a box `width` × `height`, as the
 * route's yellow line `line` points thick. */
export function OutlineLines({
  points,
  strokes = [],
  width,
  height,
  line = LINE,
}: {
  points: OutlinePoint[];
  strokes?: OutlinePoint[][];
  width: number;
  height: number;
  line?: number;
}) {
  return (
    <>
      <Sides
        segments={segmentsOf(points, width, height, line)}
        line={line}
        testID="outline-side"
      />
      {strokes.map((stroke, index) => (
        <Sides
          key={index}
          segments={segmentsOf(stroke, width, height, line)}
          line={line}
          testID="detail-side"
        />
      ))}
    </>
  );
}

/** Sides of a line, each a thin box turned along it; they take no touches.
 * `faint` for a line not yet part of the outline. */
export function Sides({
  segments,
  line = LINE,
  testID,
  faint = false,
}: {
  segments: Segment[];
  line?: number;
  testID: string;
  faint?: boolean;
}) {
  return segments.map((segment, index) => (
    <View
      key={index}
      testID={testID}
      pointerEvents="none"
      style={[
        styles.side,
        faint && styles.faint,
        {
          height: line,
          borderRadius: line / 2,
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
    backgroundColor: color.accent,
  },
  faint: {
    opacity: 0.7,
  },
});
