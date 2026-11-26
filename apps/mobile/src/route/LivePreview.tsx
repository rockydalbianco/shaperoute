import type { LatLon, Shape } from "@shaperoute/shared-types";
import { useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { useFeedMap } from "../feed/FeedMaps";
import { CREDIT_LINE, CREDIT_SIZE, creditLine } from "../feed/RouteMap";
import { t } from "../i18n";
import { type Look, lookOf } from "../mapdraw/figure";
import {
  color,
  fontSize,
  radius,
  route as routeLine,
  shapeGhost,
  space,
} from "../theme/tokens";
import { useUnits } from "../units/useUnits";
import { dashesOf, livePreview, type LivePreview as Preview } from "./previewFrame";
import { barLabel, sizeLabel } from "./ShapePreview";
import { scaleBar } from "./shapeScale";
import { shapeName } from "./shapeWords";

/** How tall the piece of map is, in points: the distance stays in view. */
export const LIVE_PREVIEW_HEIGHT = 190;
/** The outline over the map: the ghost's line while a route is drawn. */
const LINE = shapeGhost.waitWidth;
const DASH = shapeGhost.dash[0] * LINE;
const GAP = shapeGhost.dash[1] * LINE;
/** The scale bar is at most this share of the map across. */
const BAR_SHARE = 0.3;

/**
 * The shape chosen on a piece of the real map (TASK-449, ADR-0412): the
 * streets round the start, and over them the shape as large as the distance
 * makes it, its first point on the start. It grows and shrinks with the
 * distance; when it no longer fits, the map steps back.
 */
export function LivePreview({
  shape,
  distanceM,
  start,
}: {
  shape: Shape;
  distanceM: number;
  start: LatLon;
}) {
  const look = useMemo(() => lookOf({ kind: "shape", shape }), [shape]);
  return (
    <OutlineOnMap
      look={look}
      distanceM={distanceM}
      start={start}
      name={shapeName(shape)}
    />
  );
}

/**
 * An outline on a piece of the real map, from `start`, `distanceM` long.
 * The map is a picture (`useFeedMap`), one for as long as the outline stays
 * in its frame; the outline is drawn here, again at every distance. Only
 * the ideal outline, where the engine first tries it: never a route.
 */
export function OutlineOnMap({
  look,
  distanceM,
  start,
  name,
}: {
  look: Look;
  distanceM: number;
  start: LatLon;
  /** What is drawn, for who cannot see it. */
  name: string;
}) {
  const units = useUnits();
  // The room across, measured: whole points, as a picture is asked for.
  const [room, setRoom] = useState(0);
  const width = Math.floor(room);
  const [lat, lon] = start;
  const made = useMemo(
    () => livePreview(look, [lat, lon], distanceM, width, LIVE_PREVIEW_HEIGHT),
    [look, lat, lon, distanceM, width],
  );
  const size = made === null ? null : sizeLabel(made.widthM, made.heightM, units);
  const bar = made === null ? null : scaleBar(made.frame.widthM, BAR_SHARE);
  return (
    <View
      style={styles.preview}
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        size === null ? name : t("{name}, about {size} on the map", { name, size })
      }
      testID="live-preview"
    >
      <View
        style={styles.map}
        onLayout={(event) => setRoom(event.nativeEvent.layout.width)}
        testID="live-preview-room"
      >
        {made !== null && <PieceOfMap made={made} width={width} />}
      </View>
      {size !== null && bar !== null && (
        <View style={styles.facts}>
          <Text style={styles.size}>≈ {size}</Text>
          <View style={styles.scale}>
            <View
              style={[styles.bar, { width: Math.max(space.sm, bar.share * width) }]}
            />
            <Text style={styles.barText}>{barLabel(bar.metres, units)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

/** The picture of the frame, the outline dashed over it, the start's dot. */
function PieceOfMap({ made, width }: { made: Preview; width: number }) {
  // The same frame, the same line to fit: the picture is asked for once.
  const corners = useMemo(
    () => made.corners,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [made.key],
  );
  const map = useFeedMap(`preview:${made.key}`, corners, width, LIVE_PREVIEW_HEIGHT, 0);
  const dashes = useMemo(
    () => made.points.flatMap((line) => dashesOf(line, DASH, GAP, LINE)),
    [made.points],
  );
  const [x, y] = made.dot;
  return (
    <>
      {map !== null && (
        <Image
          source={{ uri: map }}
          style={styles.picture}
          resizeMode="stretch"
          testID="live-preview-map"
        />
      )}
      {dashes.map((dash, index) => (
        <View
          key={index}
          testID="live-preview-dash"
          pointerEvents="none"
          style={[
            styles.dash,
            {
              left: dash.left,
              top: dash.top,
              width: dash.length,
              transform: [{ rotate: `${dash.angle}rad` }],
            },
          ]}
        />
      ))}
      <View
        testID="live-preview-start"
        pointerEvents="none"
        style={[
          styles.dot,
          { left: x - shapeGhost.pen / 2, top: y - shapeGhost.pen / 2 },
        ]}
      />
      {map !== null && (
        <Text style={styles.credit} numberOfLines={1}>
          {creditLine()}
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  preview: {
    gap: space.sm,
  },
  map: {
    height: LIVE_PREVIEW_HEIGHT,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: color.map.background,
    borderWidth: 1,
    borderColor: color.border,
  },
  picture: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  dash: {
    position: "absolute",
    height: LINE,
    backgroundColor: shapeGhost.color,
    opacity: shapeGhost.waitBright,
  },
  dot: {
    position: "absolute",
    width: shapeGhost.pen,
    height: shapeGhost.pen,
    borderRadius: shapeGhost.pen / 2,
    backgroundColor: routeLine.color,
  },
  credit: {
    position: "absolute",
    left: space.sm,
    right: space.sm,
    bottom: space.xs,
    color: color.textFaint,
    fontSize: CREDIT_SIZE,
    lineHeight: CREDIT_LINE,
    textAlign: "right",
  },
  facts: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  size: {
    color: color.text,
    fontSize: fontSize.body,
  },
  scale: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  bar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: color.textMuted,
  },
  barText: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
});
