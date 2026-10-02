import { FlatList, StyleSheet, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FeedPost } from "../feed/FeedPost";
import { SAMPLE_FEED, type SamplePost } from "../feed/sampleFeed";
import { color, space } from "../theme/tokens";

/**
 * «Feed», the page at the left of «Draw» (TASK-154): where the drawings that
 * runners publish will be (TASK-118). Until then it shows examples: figures
 * of the catalogue with made-up runners (TASK-156, ADR-0127). Nothing on the
 * page says they are examples: the user's choice.
 */
export function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = width - 2 * space.lg;
  return (
    <FlatList<SamplePost>
      style={[StyleSheet.absoluteFill, styles.screen]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + space.lg,
          paddingBottom: insets.bottom + space.xl,
        },
      ]}
      data={SAMPLE_FEED}
      keyExtractor={(post) => post.id}
      renderItem={({ item }) => <FeedPost post={item} width={cardWidth} />}
      // A drawing is a hundred views: a few at a time, the others as they come.
      initialNumToRender={2}
      maxToRenderPerBatch={2}
      windowSize={5}
      showsVerticalScrollIndicator={false}
    />
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
