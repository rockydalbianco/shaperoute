import { FlatList, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FeedMapShooter } from "../feed/FeedMaps";
import { drawingHeight, FeedPost } from "../feed/FeedPost";
import { SAMPLE_FEED, type SamplePost } from "../feed/sampleFeed";
import { FindFriendsButton } from "../social/FindFriendsButton";
import { color, space } from "../theme/tokens";

type Props = {
  /** A drawing was tapped: its route goes on the map. */
  onOpen: (post: SamplePost) => void;
};

/**
 * «Feed», the page at the left of «Draw» (TASK-154): where the drawings that
 * runners publish will be (TASK-118). Until then it shows examples: figures
 * of the catalogue with made-up runners (TASK-156, ADR-0127). Nothing on the
 * page says they are examples: the user's choice. Under each line is the map
 * of its streets (TASK-162): a picture, taken by a map page that the list
 * covers. A tap on a drawing opens its route on the map (TASK-188). Above
 * the drawings, the way to find friends by name (TASK-215).
 */
export function FeedScreen({ onOpen }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = width - 2 * space.lg;
  return (
    <View style={StyleSheet.absoluteFill}>
      <FeedMapShooter width={cardWidth} height={drawingHeight(cardWidth)} />
      <FlatList<SamplePost>
        style={[StyleSheet.absoluteFill, styles.screen]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + space.lg,
            paddingBottom: insets.bottom + space.xl,
          },
        ]}
        ListHeaderComponent={<FindFriendsButton />}
        data={SAMPLE_FEED}
        keyExtractor={(post) => post.id}
        renderItem={({ item }) => (
          <FeedPost post={item} width={cardWidth} onOpen={() => onOpen(item)} />
        )}
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
  content: {
    gap: space.md,
    paddingHorizontal: space.lg,
  },
});
