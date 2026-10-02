import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { cityName } from "../explore/recommendedRoutes";
import { thumbSegments } from "../explore/RouteThumb";
import { durationLabel } from "../screens/FinishScreen";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  route as routeLine,
  space,
} from "../theme/tokens";
import type { SamplePost } from "./sampleFeed";

/** How tall the drawing is, for how wide: most figures are wider than tall. */
const DRAWING_RATIO = 0.62;
/** The line of a drawing this wide: thicker than on a card of «Explore». */
const LINE_WIDTH = 3;

type Props = {
  post: SamplePost;
  /** How wide the card is: the drawing fills it. */
  width: number;
};

/** "dog_head" → "Dog head". */
export function shapeLabel(shape: string): string {
  const words = shape.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** "Moon · 4.9 km · 27 min": what was drawn, how far, how long. */
export function postFacts(post: SamplePost): string {
  return `${shapeLabel(post.shape)} · ${(post.route_m / 1000).toFixed(1)} km · ${durationLabel(post.minutes * 60_000)}`;
}

/**
 * A drawing in «Feed» (TASK-156): who ran it and where, the line, its score,
 * its title. The line is yellow, the route's colour; the score is not.
 */
export function FeedPost({ post, width }: Props) {
  const height = Math.round(width * DRAWING_RATIO);
  const segments = useMemo(
    () => thumbSegments(post.line, width, height, space.xl),
    [post.line, width, height],
  );
  const city = cityName(post.city);
  return (
    <View
      style={styles.card}
      testID="feed-post"
      accessible
      accessibilityLabel={`${post.user} in ${city}: ${post.title}. ${postFacts(post)}. Score ${post.score} out of 100.`}
    >
      <View style={styles.who}>
        <View style={styles.avatar}>
          <Text style={styles.initial}>{post.user.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.names}>
          <Text style={styles.user}>{post.user}</Text>
          <Text style={styles.city}>{city}</Text>
        </View>
      </View>
      <View style={[styles.drawing, { width, height }]} testID="feed-drawing">
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
        <View style={styles.score}>
          <Text style={styles.scoreNumber}>{post.score}</Text>
          <Text style={styles.outOf}>out of 100</Text>
        </View>
      </View>
      <View style={styles.words}>
        <Text style={styles.title}>{post.title}</Text>
        <Text style={styles.facts}>{postFacts(post)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    overflow: "hidden",
  },
  who: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
  },
  avatar: {
    width: MIN_TAP_SIZE - space.sm,
    height: MIN_TAP_SIZE - space.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  initial: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  names: {
    flex: 1,
    gap: 2,
  },
  user: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  city: {
    color: color.textMuted,
    fontSize: fontSize.detail,
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
  // Not yellow: that is the route's (docs/UI.md, «La fine della corsa»).
  score: {
    position: "absolute",
    left: space.md,
    bottom: space.md,
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.background,
  },
  scoreNumber: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  outOf: {
    color: color.textMuted,
    fontSize: fontSize.detail,
  },
  words: {
    gap: 2,
    padding: space.md,
  },
  title: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  facts: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
});
