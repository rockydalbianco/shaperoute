import type { LatLon } from "@shaperoute/shared-types";
import { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { type Camera, lineCamera } from "../feed/feedMapPage";
import { useFeedMap } from "../feed/FeedMaps";
import { MAP_CREDIT } from "../feed/FeedPost";
import {
  color,
  fontSize,
  fontWeight,
  radius,
  route as routeLine,
  space,
} from "../theme/tokens";
import { thumbSegments } from "./RouteThumb";
import { useTapNotSwipe } from "./useTapNotSwipe";

/** How tall the drawing is, for how wide: room for a figure taller than wide. */
const DRAWING_RATIO = 0.66;
/** The line of a drawing half a phone wide: thicker than in a row's thumb. */
const LINE_WIDTH = 3;
/** Clear around the line, on every side. */
const DRAWING_PAD = space.md;

/** No line: nothing to lay a map under. */
const NO_LINE: LatLon[] = [];

/** How wide a card is when two stand side by side in `width`, `gap` apart. */
export function cardWidth(width: number, gap: number = space.md): number {
  return Math.max(0, Math.floor((width - gap) / 2));
}

/** How tall the drawing of a card `width` wide is. */
export function cardDrawingHeight(width: number): number {
  return Math.round(width * DRAWING_RATIO);
}

/**
 * What the map under a line is called among the pictures taken: by what it
 * frames, not by its route. An example drawn again keeps its id and may
 * change its line; the same streets are the same picture.
 */
export function framingName(camera: Camera | null): string {
  if (camera === null) {
    return "card";
  }
  const [lon, lat] = camera.center;
  return `card:${lat.toFixed(5)},${lon.toFixed(5)}@${camera.zoom.toFixed(2)}`;
}

/**
 * Whose the maps under the cards are, as their makers ask to be named
 * (`MAP_CREDIT`), in one line. A card is half a phone wide: written on each
 * picture, the credit would cover the names of its towns.
 */
export const CARD_MAPS_CREDIT = `Maps: ${MAP_CREDIT.replace("\n", " · ")}`;

/** The credit of the maps of a group of cards: once, beside the cards. */
export function CardMapsCredit() {
  return <Text style={styles.credit}>{CARD_MAPS_CREDIT}</Text>;
}

type Props = {
  /** How wide the card is: the drawing fills it. */
  width: number;
  /** The line to draw; null while there is none, as an example not drawn yet. */
  line: LatLon[] | null;
  /** "Star · 5.1 km". */
  title: string;
  /** Under the title: where it is, or where its drawing has got to. */
  detail?: string;
  /** How much it looks like the shape, from 0 to 1; shown as "97%". */
  match?: number;
  /** Lays the map of its streets under the line, as in «Feed» (TASK-174). */
  map?: boolean;
  /**
   * Opens the route; without it the card is not a button. A tap opens it, a
   * swipe that ends over the card does not (TASK-196).
   */
  onPress?: () => void;
  /** What a screen reader says in place of the texts. */
  accessibilityLabel?: string;
};

/**
 * A route as a card of «Explore» (TASK-167, ADR-0135): the drawing first,
 * as wide as the card, then what it is and where. Two stand side by side.
 * The line is yellow, the route's colour; nothing else on the card is.
 * With `map`, under the line is the map of where it runs, towns named, once
 * its picture is taken (TASK-174): the pictures are those of «Feed»
 * (TASK-162), taken by its page. Who shows cards with `map` shows
 * `CardMapsCredit` beside them. A finger that slides over a card has not
 * touched it (TASK-196, `useTapNotSwipe`).
 */
export function RouteCard({
  width,
  line,
  title,
  detail,
  match,
  map = false,
  onPress,
  accessibilityLabel,
}: Props) {
  const height = cardDrawingHeight(width);
  const mapped = map && line !== null ? line : NO_LINE;
  const framing = useMemo(
    () => framingName(lineCamera(mapped, width, height, DRAWING_PAD)),
    [mapped, width, height],
  );
  const picture = useFeedMap(framing, mapped, width, height, DRAWING_PAD);
  const segments = useMemo(
    () => (line === null ? [] : thumbSegments(line, width, height, DRAWING_PAD)),
    [line, width, height],
  );
  const tap = useTapNotSwipe(onPress);
  const body = (
    <>
      <View style={[styles.drawing, { width, height }]} testID="route-card-drawing">
        {picture !== null && (
          <Image
            testID="route-card-map"
            style={StyleSheet.absoluteFill}
            source={{ uri: picture }}
            accessible={false}
          />
        )}
        {segments.map((s, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              {
                left: s.left,
                top: s.top - LINE_WIDTH / 2,
                width: s.length + LINE_WIDTH / 2,
                transform: [{ rotate: `${s.angle}deg` }],
              },
            ]}
          />
        ))}
        {match !== undefined && (
          <View style={styles.match}>
            <Text style={styles.matchText}>{`${Math.round(match * 100)}%`}</Text>
          </View>
        )}
      </View>
      <View style={styles.words}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {detail !== undefined && (
          <Text style={styles.detail} numberOfLines={1}>
            {detail}
          </Text>
        )}
      </View>
    </>
  );
  if (onPress === undefined) {
    return (
      <View style={[styles.card, { width }]} testID="route-card">
        {body}
      </View>
    );
  }
  return (
    <Pressable
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}
      onPressIn={tap.onPressIn}
      onPress={tap.onPress}
      testID="route-card"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.6,
  },
  drawing: {
    backgroundColor: color.map.background,
    overflow: "hidden",
  },
  segment: {
    position: "absolute",
    height: LINE_WIDTH,
    borderRadius: LINE_WIDTH / 2,
    backgroundColor: routeLine.color,
  },
  // Not yellow: that is the line's (docs/UI.md, «Il tema»).
  match: {
    position: "absolute",
    top: space.sm,
    right: space.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs / 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.background,
  },
  matchText: {
    color: color.text,
    fontSize: fontSize.detail,
    fontWeight: fontWeight.semibold,
  },
  credit: {
    color: color.textFaint,
    fontSize: fontSize.label,
    textAlign: "right",
  },
  words: {
    gap: 2,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  title: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  detail: {
    color: color.textMuted,
    fontSize: fontSize.detail,
  },
});
