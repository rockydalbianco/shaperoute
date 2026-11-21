import { useRef, useState } from "react";
import {
  Image,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { drawingPhotoSource } from "../api/drawings";
import { t } from "../i18n";
import { ImportedMark } from "../imports/ImportedMark";
import { useBlockedNow } from "../social/blockedNow";
import { agoLabel } from "../social/commentText";
import { itemsOf } from "../social/composer/postOrder";
import { useFollowsDoor } from "../social/followsDoor";
import { OutfitTagLayer } from "../social/outfit/OutfitTagLayer";
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
import { PhotoViewer } from "./PhotoViewer";
import { PostActions } from "./PostActions";
import type { PostReactionsHandle } from "./PostReactions";
import { drawingHeight } from "./RouteMap";
import { useDoubleTap } from "./useDoubleTap";

/** The side of a dot under the photos. */
const DOT = 6;

type Props = {
  post: ShownPost;
  width: number;
  /** Opens the post's page. */
  onOpen: () => void;
};

/** The photos of a post, in its order: a post of photos only has no map
 * among them. */
export function photoPages(post: ShownPost): number[] {
  const places = (post.drawing.photos ?? []).map((photo) => photo.n);
  return itemsOf(post.drawing.order, places).flatMap((item) =>
    item.kind === "photo" ? [item.n] : [],
  );
}

/**
 * A post of photos only in «Feed» (TASK-312 part C, docs/IMPORTAZIONI.md
 * §4): photos taken elsewhere, without a run. As a member's drawing
 * (FeedPost), without the map, the line or the numbers: its author and when
 * it was published, its photos one whole width each to swipe sideways with
 * the dots under them, its title, «Imported», and the actions under the
 * card, without «Share», which needs a line (no link, no poster) and is
 * not sent in a chat. A tap on a photo opens it on the whole screen, two
 * taps are a super like, a tap elsewhere opens its page. On another
 * member's post a «…» reports it or blocks its author (TASK-121).
 */
export function PhotoFeedPost({ post, width, onOpen }: Props) {
  const { apiUrl, account, openProfile } = useFollowsDoor();
  const author = post.drawing.author;
  const blocked = useBlockedNow(author.public_id);
  const [page, setPage] = useState(0);
  const [reached, setReached] = useState(0);
  const [viewing, setViewing] = useState<number | null>(null);
  const reactions = useRef<PostReactionsHandle>(null);
  const tap = useDoubleTap(() => reactions.current?.superLike());
  if (blocked) {
    return null;
  }
  const { state } = account;
  const signedIn = state.status === "signedIn" ? state.session : null;
  const mine = signedIn !== null && signedIn.user.public_id === author.public_id;
  const height = drawingHeight(width);
  const pages = photoPages(post);
  const photos =
    apiUrl !== null && signedIn !== null
      ? (post.drawing.photos ?? []).map((photo) => ({
          n: photo.n,
          source: drawingPhotoSource(apiUrl, signedIn.token, photo),
          drawn: photo,
        }))
      : [];
  const ago = agoLabel(post.drawing.started_at);
  function onPaged({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) {
    const shown = Math.round(nativeEvent.contentOffset.x / width);
    setPage(shown);
    setReached((was) => Math.max(was, shown));
  }
  const whole = photos.find((photo) => photo.n === viewing);
  return (
    <View style={styles.card} testID="photo-feed-post">
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
          <Text style={styles.initial}>{author.username.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.names}>
          <Text style={styles.user}>{author.username}</Text>
          <Text style={styles.when}>{ago}</Text>
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
      <View>
        <ScrollView
          style={{ width }}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onPaged}
          testID="feed-pages"
        >
          {pages.map((n, i) => {
            const photo = photos.find((one) => one.n === n);
            return (
              <Tap
                key={n}
                style={{ width, height }}
                onPress={() => tap(() => setViewing(n))}
                accessibilityRole="imagebutton"
                accessibilityLabel={t("Photo {n}", { n: String(i + 1) })}
                testID="feed-page-tap"
              >
                {/* Loaded once the page before it was shown, never further on. */}
                {photo !== undefined && i <= reached + 1 ? (
                  <>
                    <Image
                      testID="feed-photo"
                      style={[StyleSheet.absoluteFill, styles.photo]}
                      source={photo.source}
                      resizeMode="cover"
                      accessible={false}
                    />
                    <OutfitTagLayer
                      photo={photo.drawn}
                      fit="cover"
                      toggle="hanger"
                      author={author}
                      hangerStyle={{ top: space.xxl + space.sm, left: space.md }}
                    />
                  </>
                ) : (
                  <View
                    testID="feed-photo-later"
                    style={[StyleSheet.absoluteFill, styles.photo]}
                  />
                )}
              </Tap>
            );
          })}
        </ScrollView>
        {pages.length > 1 && (
          <View
            style={styles.counter}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            testID="feed-counter"
          >
            <Text style={styles.counterText}>{`${page + 1}/${pages.length}`}</Text>
          </View>
        )}
      </View>
      {pages.length > 1 && (
        <View style={styles.dots} testID="feed-dots">
          {pages.map((n, i) => (
            <View
              key={n}
              testID={i === page ? "feed-dot-on" : "feed-dot"}
              style={[styles.dot, i === page && styles.dotOn]}
            />
          ))}
        </View>
      )}
      <Tap
        style={styles.words}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={
          post.drawing.title === null
            ? t("Imported")
            : `${post.drawing.title}. ${t("Imported")}`
        }
        testID="feed-post"
      >
        {post.drawing.title !== null && (
          <Text style={styles.title}>{post.drawing.title}</Text>
        )}
        <ImportedMark />
      </Tap>
      <Hairline />
      <PostActions post={post} mine={mine} reactionsHandle={reactions} />
      {whole !== undefined && (
        <PhotoViewer
          source={whole.source}
          drawingId={post.drawing.id}
          n={whole.n}
          onClose={() => setViewing(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // A photo at its face: the large radius, no border (TASK-339).
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
  photo: {
    backgroundColor: color.surfaceRaised,
  },
  counter: {
    position: "absolute",
    top: space.md,
    left: space.md,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: color.scrim,
    opacity: 0.75,
  },
  counterText: {
    ...font.small,
    color: color.onScrim,
    fontWeight: fontWeight.semibold,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: space.xs,
    paddingTop: space.sm,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: color.borderStrong,
  },
  dotOn: {
    backgroundColor: color.text,
  },
  words: {
    gap: space.xs,
    padding: space.md,
  },
  title: {
    ...font.cardTitle,
    color: color.text,
  },
});
