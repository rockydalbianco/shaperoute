import { useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { FeedPost } from "../feed/FeedPost";
import { SAMPLE_FEED, type SamplePost } from "../feed/sampleFeed";
import { color, fontSize, fontWeight, space } from "../theme/tokens";
import type { Example } from "./exampleRoutes";

/** Enough to look at for a minute; each drawing is a hundred views. */
export const POSTS_SHOWN = 5;

/** A card still says "Next" or "Drawing…". */
export function stillDrawing(examples: Example[] | null): boolean {
  return (
    examples !== null &&
    examples.some((e) => e.status === "waiting" || e.status === "drawing")
  );
}

/**
 * The drawings of «Feed» shown for one city, in the feed's order from a
 * place that depends on the city: another city, other drawings first.
 */
export function postsFor(
  key: string,
  feed: readonly SamplePost[] = SAMPLE_FEED,
  most: number = POSTS_SHOWN,
): SamplePost[] {
  if (feed.length === 0) {
    return [];
  }
  let first = 0;
  for (let i = 0; i < key.length; i += 1) {
    first = (first + key.charCodeAt(i)) % feed.length;
  }
  return Array.from(
    { length: Math.min(most, feed.length) },
    (_, i) => feed[(first + i) % feed.length],
  );
}

/**
 * True from the first example of `key` still to draw until another city:
 * the drawings do not leave the page under the finger when the last example
 * arrives. A city whose examples were already on the phone never waits.
 */
export function useWaited(key: string | null, drawing: boolean): boolean {
  const [waited, setWaited] = useState<string | null>(null);
  if (drawing && key !== null && waited !== key) {
    setWaited(key);
  }
  return key !== null && (drawing || waited === key);
}

type Props = {
  /** The city being drawn, as `cityKey` names it. */
  cityKey: string;
  /** An example is still to draw: the line under the title says to wait. */
  drawing: boolean;
};

/**
 * Something to look at while a city's examples are drawn (TASK-163): the
 * first time the map has to download, and the wait can be a minute. The
 * drawings are those of «Feed» (TASK-156), as they are there.
 */
export function WhileDrawing({ cityKey, drawing }: Props) {
  const { width } = useWindowDimensions();
  // As wide as a card of «Feed»: the page has the same margins.
  const cardWidth = width - 2 * space.lg;
  return (
    <View style={styles.section}>
      <Text style={styles.label}>MEANWHILE, FROM THE FEED</Text>
      <Text style={styles.note}>
        {drawing
          ? "The first time in a city the map has to download: it can take a minute. The shapes show up above as they are ready."
          : "The shapes of this city are ready above."}
      </Text>
      {postsFor(cityKey).map((post) => (
        <FeedPost key={post.id} post={post} width={cardWidth} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space.md,
    paddingTop: space.md,
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
  },
  note: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
});
