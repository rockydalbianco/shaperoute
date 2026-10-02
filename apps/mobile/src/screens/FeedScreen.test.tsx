import { fireEvent, render, screen } from "@testing-library/react-native";

import { StyleSheet } from "react-native";

import { forgetFeedMaps } from "../feed/FeedMaps";
import { SAMPLE_FEED } from "../feed/sampleFeed";
import { FeedScreen } from "./FeedScreen";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

function noOpen(): void {}

test("until runners publish, the page shows the example drawings", async () => {
  await render(<FeedScreen onOpen={noOpen} />);
  // The first drawings are there; the others come as the list scrolls.
  const [first] = SAMPLE_FEED;
  expect(screen.getByText(first.user)).toBeOnTheScreen();
  expect(screen.getByText(first.title)).toBeOnTheScreen();
  expect(screen.getAllByTestId("feed-post").length).toBeGreaterThanOrEqual(2);
  // The drawings are all there is: no line above them (the user's choice).
  expect(screen.queryByText(/^Examples/)).toBeNull();
});

test("a tap on a drawing opens its route (TASK-188)", async () => {
  const onOpen = jest.fn();
  await render(<FeedScreen onOpen={onOpen} />);
  const [first, second] = SAMPLE_FEED;
  // Nothing else to touch: no likes, no comments (TASK-118).
  const cards = screen.getAllByRole("button");
  expect(cards).toHaveLength(screen.getAllByTestId("feed-post").length);
  await fireEvent.press(cards[1]);
  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(onOpen).toHaveBeenCalledWith(second);
  await fireEvent.press(cards[0]);
  expect(onOpen).toHaveBeenLastCalledWith(first);
});

test("takes a picture of the map of each drawing, and lays it under its line", async () => {
  forgetFeedMaps();
  await render(<FeedScreen onOpen={noOpen} />);
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
