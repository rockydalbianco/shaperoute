import type { LatLon } from "@shaperoute/shared-types";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  color,
  fontSize,
  fontWeight,
  radius,
  route as routeLine,
  space,
} from "../theme/tokens";
import { thumbSegments } from "./RouteThumb";

/** How tall the drawing is, for how wide: room for a figure taller than wide. */
const DRAWING_RATIO = 0.66;
/** The line of a drawing half a phone wide: thicker than in a row's thumb. */
const LINE_WIDTH = 3;
/** Clear around the line, on every side. */
const DRAWING_PAD = space.md;

/** How wide a card is when two stand side by side in `width`, `gap` apart. */
export function cardWidth(width: number, gap: number = space.md): number {
  return Math.max(0, Math.floor((width - gap) / 2));
}

/** How tall the drawing of a card `width` wide is. */
export function cardDrawingHeight(width: number): number {
  return Math.round(width * DRAWING_RATIO);
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
  /** Opens the route; without it the card is not a button. */
  onPress?: () => void;
  /** What a screen reader says in place of the texts. */
  accessibilityLabel?: string;
};

/**
 * A route as a card of «Explore» (TASK-167, ADR-0135): the drawing first,
 * as wide as the card, then what it is and where. Two stand side by side.
 * The line is yellow, the route's colour; nothing else on the card is.
 */
export function RouteCard({
  width,
  line,
  title,
  detail,
  match,
  onPress,
  accessibilityLabel,
}: Props) {
  const height = cardDrawingHeight(width);
  const segments = useMemo(
    () => (line === null ? [] : thumbSegments(line, width, height, DRAWING_PAD)),
    [line, width, height],
  );
  const body = (
    <>
      <View style={[styles.drawing, { width, height }]} testID="route-card-drawing">
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
      onPress={onPress}
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
