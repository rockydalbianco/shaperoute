import { fireEvent, render, screen } from "@testing-library/react-native";

import { StyleSheet } from "react-native";

import { forgetFeedMaps } from "../feed/FeedMaps";
import { SAMPLE_FEED } from "../feed/sampleFeed";
import { FeedScreen } from "./FeedScreen";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

test("until runners publish, the page shows the example drawings", async () => {
  await render(<FeedScreen />);
  // The first drawings are there; the others come as the list scrolls.
  const [first] = SAMPLE_FEED;
  expect(screen.getByText(first.user)).toBeOnTheScreen();
  expect(screen.getByText(first.title)).toBeOnTheScreen();
  expect(screen.getAllByTestId("feed-post").length).toBeGreaterThanOrEqual(2);
  // The drawings are all there is: no line above them (the user's choice).
  expect(screen.queryByText(/^Examples/)).toBeNull();
  // They are to look at: nothing to touch that the app cannot keep.
  expect(screen.queryByRole("button")).toBeNull();
});

test("takes a picture of the map of each drawing, and lays it under its line", async () => {
  forgetFeedMaps();
  await render(<FeedScreen />);
  expect(screen.queryByTestId("feed-map")).toBeNull();

  // The page that takes the pictures: as large as a drawing, under the list.
  const page = screen.getByTestId("feed-map-page", { includeHiddenElements: true });
  const [drawing] = screen.getAllByTestId("feed-drawing");
  const { width, height } = StyleSheet.flatten(drawing.props.style);
  expect(page.parent).toHaveStyle({ width, height });

  await fireEvent(page, "message", { nativeEvent: { data: '{"type":"ready"}' } });
  const [first] = SAMPLE_FEED;
  await fireEvent(page, "message", {
    nativeEvent: {
      data: JSON.stringify({
        type: "shot",
        key: `${first.id}:${width}x${height}`,
        image: "data:image/jpeg;base64,AAAA",
      }),
    },
  });
  // The first drawing has its map; the others wait for theirs.
  expect(
    screen.getAllByTestId("feed-map", { includeHiddenElements: true }),
  ).toHaveLength(1);
  expect(drawing.children[0]).toBe(
    screen.getByTestId("feed-map", { includeHiddenElements: true }),
  );
});
