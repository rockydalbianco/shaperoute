import type { MessagePostCard } from "@shaperoute/shared-types";
import { StyleSheet, Text, View } from "react-native";

import { RouteThumb } from "../explore/RouteThumb";
import { t } from "../i18n";
import { color, fontSize, fontWeight, space } from "../theme/tokens";
import { POST_GONE, postByline, postTitle } from "./messagePost";

/** The side of a post's line in a message: as a drawing's (MessageMedia). */
export const POST_SIDE = 140;

type Props = {
  /** The card the API answered for who reads; null: not theirs to open. */
  post: MessagePostCard | null;
};

/**
 * A post in the bubble of a message (TASK-455, ADR-0382): the line of its
 * drawing, what it is called, who published it and how long it is. A tap on
 * the bubble opens the post (ConversationScreen). A post who reads may not
 * open, or one deleted since, says so and is not a button: the API sends no
 * card for it, so nothing of it is here to show.
 */
export function PostCard({ post }: Props) {
  if (post === null) {
    return (
      <Text style={styles.gone} testID="message-post-gone">
        {t(POST_GONE)}
      </Text>
    );
  }
  const title = postTitle(post);
  return (
    <View style={styles.post} testID="message-post">
      {post.preview.length >= 2 && (
        <RouteThumb line={post.preview} width={POST_SIDE} height={POST_SIDE} />
      )}
      {title !== "" && (
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
      )}
      <Text style={styles.detail} numberOfLines={1}>
        {postByline(post)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  post: {
    gap: space.xs,
    maxWidth: POST_SIDE,
  },
  title: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  detail: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  gone: {
    color: color.textMuted,
    fontSize: fontSize.body,
    fontStyle: "italic",
  },
});
