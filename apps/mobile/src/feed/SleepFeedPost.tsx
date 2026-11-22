import { useRef } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { authHeaders } from "../api/accounts";
import { keyHeaders } from "../api/apiUrl";
import { sleepSummaryOf } from "../api/sleep";
import { sleepPostsOn } from "../health/sleepModules";
import { sleepScoreText, sleepTimeText } from "../health/sleepText";
import { t } from "../i18n";
import { useBlockedNow } from "../social/blockedNow";
import { agoLabel } from "../social/commentText";
import { useFollowsDoor } from "../social/followsDoor";
import { ReportMenu } from "../social/ReportMenu";
import {
  color,
  font,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Hairline } from "../ui/Hairline";
import { Tap } from "../ui/Tap";
import type { ShownPost } from "./feedPosts";
import { PostActions } from "./PostActions";
import type { PostReactionsHandle } from "./PostReactions";
import { SleepPostCard } from "./SleepPostCard";
import { useDoubleTap } from "./useDoubleTap";

export const SLEEP_FEED_POST_TEST_ID = "sleep-feed-post";

type Props = {
  post: ShownPost;
  /** Opens the post's page. */
  onOpen: () => void;
};

/**
 * The post of a night of sleep in «Feed» (TASK-467 part E): as a member's
 * drawing (FeedPost) without the map, the line or the numbers of a run.
 * Its author and when it was published, the night where a run has its map
 * (SleepPostCard: «Sleep score», the score with its word, the hours and
 * the stages), and the actions under the card. A tap on the night opens
 * its page, two are a super like. On another member's post a «…» reports
 * it or blocks its author (TASK-121). Nothing while the sleep is off, or
 * for a post whose night cannot be read.
 */
export function SleepFeedPost({ post, onOpen }: Props) {
  const { apiUrl, account, openProfile } = useFollowsDoor();
  const author = post.drawing.author;
  const blocked = useBlockedNow(author.public_id);
  const reactions = useRef<PostReactionsHandle>(null);
  const tap = useDoubleTap(() => reactions.current?.superLike());
  const night = sleepPostsOn() ? sleepSummaryOf(post.drawing.sleep) : null;
  if (blocked || night === null) {
    return null;
  }
  const { state } = account;
  const signedIn = state.status === "signedIn" ? state.session : null;
  const mine = signedIn !== null && signedIn.user.public_id === author.public_id;
  // The author's picture, as on a run's card (TASK-355 part B); the initial
  // without one.
  const face =
    author.photo != null && apiUrl !== null && signedIn !== null
      ? {
          uri: `${apiUrl}${author.photo}`,
          headers: { ...keyHeaders(), ...authHeaders(signedIn.token) },
        }
      : null;
  return (
    <View style={styles.card} testID={SLEEP_FEED_POST_TEST_ID}>
      <Tap
        style={styles.who}
        onPress={() =>
          openProfile({
            public_id: author.public_id,
            username: author.username,
            photo: null,
          })
        }
        accessibilityRole="button"
        accessibilityLabel={t("{name}'s profile", { name: author.username })}
        testID="feed-author"
      >
        <View style={styles.avatar}>
          {face === null ? (
            <Text style={styles.initial}>
              {author.username.charAt(0).toUpperCase()}
            </Text>
          ) : (
            <Image
              source={face}
              style={styles.face}
              accessibilityIgnoresInvertColors
              testID="feed-author-photo"
            />
          )}
        </View>
        <View style={styles.names}>
          <Text style={styles.user}>{author.username}</Text>
          <Text style={styles.when}>{agoLabel(post.drawing.started_at)}</Text>
        </View>
      </Tap>
      {!mine && apiUrl !== null && signedIn !== null && (
        <View style={styles.menu}>
          <ReportMenu
            apiUrl={apiUrl}
            token={signedIn.token}
            target={{ kind: "drawing", id: post.drawing.id }}
            person={author}
            onSessionEnded={account.sessionEnded}
          />
        </View>
      )}
      <Tap
        style={styles.night}
        onPress={() => tap(onOpen)}
        accessibilityRole="button"
        accessibilityLabel={[
          t("Sleep score"),
          sleepScoreText(night.score),
          sleepTimeText(night.asleep_min),
        ].join(", ")}
        testID="feed-post"
      >
        <SleepPostCard sleep={night} />
      </Tap>
      <Hairline />
      <PostActions post={post} mine={mine} reactionsHandle={reactions} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    backgroundColor: color.surface,
    overflow: "hidden",
  },
  who: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    // Where the «…» lies over the row.
    paddingRight: MIN_TAP_SIZE + space.md,
  },
  menu: {
    position: "absolute",
    top: space.sm,
    right: space.sm,
  },
  avatar: {
    width: MIN_TAP_SIZE - space.sm,
    height: MIN_TAP_SIZE - space.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  face: {
    width: MIN_TAP_SIZE - space.sm,
    height: MIN_TAP_SIZE - space.sm,
    borderRadius: radius.pill,
  },
  initial: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  names: {
    flex: 1,
    gap: 2,
  },
  user: {
    ...font.body,
    color: color.text,
    fontWeight: fontWeight.medium,
  },
  when: {
    ...font.detail,
    color: color.textMuted,
  },
  // The night's own box is on the surface too: no second padding around it.
  night: {
    paddingBottom: space.xs,
  },
});
