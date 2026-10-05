import { useCallback, useMemo } from "react";
import {
  FlatList,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native";
import type { NativeAd } from "react-native-google-mobile-ads";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { feedAds } from "../ads/admob";
import type { FeedAds } from "../ads/feedAds";
import { useFeedAds } from "../ads/useFeedAds";
import { FeedAd } from "../feed/FeedAd";
import { FeedMapShooter } from "../feed/FeedMaps";
import { drawingHeight, FeedPost } from "../feed/FeedPost";
import { SAMPLE_FEED, type SamplePost } from "../feed/sampleFeed";
import { type FeedItem, feedWithAds } from "../feed/feedWithAds";
import { FindFriendsButton } from "../social/FindFriendsButton";
import { color, space } from "../theme/tokens";

type Props = {
  /** A drawing was tapped: its route goes on the map. */
  onOpen: (post: SamplePost) => void;
  /** «Feed» is the page on the screen. Built behind «Draw» at the start, it
   * asks for no ad (and no consent) until it is (TASK-235). */
  active?: boolean;
  /** The ad network: AdMob in a build of the app, none in Expo Go. */
  ads?: FeedAds;
};

type Item = FeedItem<SamplePost, NativeAd>;

/**
 * «Feed», the page at the left of «Draw» (TASK-154): where the drawings that
 * runners publish will be (TASK-118). Until then it shows examples: figures
 * of the catalogue with made-up runners (TASK-156, ADR-0127). Nothing on the
 * page says they are examples: the user's choice. Under each line is the map
 * of its streets (TASK-162): a picture, taken by a map page that the list
 * covers. A tap on a drawing opens its route on the map (TASK-188). Above
 * the drawings, at the right, the lens that finds friends by name (TASK-215,
 * TASK-219). Between the drawings, one ad every 5 (TASK-235, ADR-0198).
 */
export function FeedScreen({ onOpen, active = true, ads = feedAds() }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = width - 2 * space.lg;
  const { ads: placed, see } = useFeedAds(SAMPLE_FEED.length, active, ads);
  const items = useMemo(() => feedWithAds(SAMPLE_FEED, placed), [placed]);
  // The posts that have been on the screen: an ad never goes where the user
  // is looking.
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<Item>[] }) => {
      for (const { item } of viewableItems) {
        if (item.kind === "post") {
          see(item.index);
        }
      }
    },
    [see],
  );
  return (
    <View style={StyleSheet.absoluteFill}>
      <FeedMapShooter width={cardWidth} height={drawingHeight(cardWidth)} />
      <FlatList<Item>
        style={[StyleSheet.absoluteFill, styles.screen]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + space.lg,
            paddingBottom: insets.bottom + space.xl,
          },
        ]}
        ListHeaderComponent={<FindFriendsButton />}
        ListHeaderComponentStyle={styles.header}
        data={items}
        keyExtractor={(item) =>
          item.kind === "post" ? item.post.id : `ad-${item.slot}`
        }
        renderItem={({ item }) =>
          item.kind === "post" ? (
            <FeedPost
              post={item.post}
              width={cardWidth}
              onOpen={() => onOpen(item.post)}
            />
          ) : ads.views === null ? null : (
            <FeedAd ad={item.ad} views={ads.views} width={cardWidth} />
          )
        }
        onViewableItemsChanged={onViewableItemsChanged}
        testID="feed-list"
        // A drawing is a hundred views: a few at a time, the others as they come.
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={5}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.background,
  },
  // The lens at the right, under the button of «Profile».
  header: {
    alignItems: "flex-end",
  },
  content: {
    gap: space.md,
    paddingHorizontal: space.lg,
  },
});
