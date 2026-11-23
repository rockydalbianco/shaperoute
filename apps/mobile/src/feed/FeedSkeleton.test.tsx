/**
 * The first page of «Feed» on its way (TASK-355 part B): the shape of two
 * cards, hidden from a screen reader as the spinner was silent.
 */
import { render, screen } from "@testing-library/react-native";

import { FeedSkeleton, SKELETON_CARDS } from "./FeedSkeleton";

test("two cards' shapes, with the old spinner's testID, nothing to read", async () => {
  await render(<FeedSkeleton />);
  const list = screen.getByTestId("feed-loading", { includeHiddenElements: true });
  expect(list.props.importantForAccessibility).toBe("no-hide-descendants");
  expect(
    screen.getAllByTestId("feed-skeleton-card", { includeHiddenElements: true }),
  ).toHaveLength(SKELETON_CARDS);
});
