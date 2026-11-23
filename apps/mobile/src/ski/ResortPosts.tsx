import type { FeedPost } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { DrawingResultCard } from "../search/DrawingResultCard";
import { useDrawingsDoor } from "../social/drawingsDoor";
import { drawingName } from "../social/DrawingsGrid";
import { color, font, fontWeight, MIN_TAP_SIZE, radius, space } from "../theme/tokens";

const COLUMNS = 2;

type Read = { id: string; posts: FeedPost[]; next: string | null };

type Props = {
  resortId: string;
  /** A post opened: the page and the search give way to the map. */
  onLeave?: () => void;
};

/**
 * «Members' days here» on a resort's page (TASK-406 part D3, ADR-0338): the
 * posts of the days skied at the resort that the reader sees, the latest
 * first, two a row as the search's drawings, each with who skied it; a tap
 * opens it on the map. Nothing when there are none, or when the API does not
 * say.
 */
export function ResortPosts({ resortId, onLeave }: Props) {
  const { resortPostsOf, open } = useDrawingsDoor();
  const [read, setRead] = useState<Read | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (resortPostsOf === undefined) {
      return;
    }
    let live = true;
    void resortPostsOf(resortId, null).then((page) => {
      if (live && page !== null) {
        setRead({ id: resortId, posts: page.posts, next: page.next });
      }
    });
    return () => {
      live = false;
    };
  }, [resortId, resortPostsOf]);
  const shown = read !== null && read.id === resortId ? read : null;
  if (shown === null || shown.posts.length === 0) {
    return null;
  }

  function more() {
    if (resortPostsOf === undefined || shown === null || shown.next === null) {
      return;
    }
    const asked = shown;
    setLoadingMore(true);
    void resortPostsOf(resortId, asked.next).then((page) => {
      setLoadingMore(false);
      if (page === null) {
        return;
      }
      setRead((was) => {
        if (was === null || was.id !== asked.id) {
          return was;
        }
        // A post already shown is not shown twice.
        const seen = new Set(was.posts.map((post) => post.id));
        return {
          id: was.id,
          posts: [...was.posts, ...page.posts.filter((post) => !seen.has(post.id))],
          next: page.next,
        };
      });
    });
  }

  const cell = width > 0 ? Math.floor((width - space.sm * (COLUMNS - 1)) / COLUMNS) : 0;
  return (
    <View
      style={styles.posts}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      testID="resort-posts"
    >
      <Text style={styles.title} accessibilityRole="header">
        {t("Members' days here")}
      </Text>
      <View style={styles.grid}>
        {cell > 0 &&
          shown.posts.map((post) => (
            <DrawingResultCard
              key={post.id}
              title={drawingName(post)}
              author={post.author.username}
              distanceM={post.distance_m}
              line={post.track_preview}
              rotationDeg={post.rotation_deg}
              activity={post.activity}
              width={cell}
              onPress={() => {
                open(post);
                onLeave?.();
              }}
              testID={`resort-post-${post.id}`}
            />
          ))}
      </View>
      {shown.next !== null && (
        <Pressable
          style={[styles.button, loadingMore && styles.busy]}
          onPress={more}
          disabled={loadingMore}
          accessibilityRole="button"
          accessibilityState={{ disabled: loadingMore, busy: loadingMore }}
        >
          <Text style={styles.buttonText}>
            {t(loadingMore ? "Loading…" : "Show more")}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  posts: {
    gap: space.sm,
  },
  title: {
    ...font.heading,
    color: color.text,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  button: {
    minHeight: MIN_TAP_SIZE,
    alignSelf: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  busy: {
    opacity: 0.6,
  },
  buttonText: {
    ...font.body,
    fontWeight: fontWeight.semibold,
    color: color.text,
  },
});
