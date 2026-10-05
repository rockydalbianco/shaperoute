import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { type ReactElement } from "react";
import { StyleSheet } from "react-native";
import type { NativeAd } from "react-native-google-mobile-ads";

import type { FeedAds } from "../ads/feedAds";
import { FAKE_AD_VIEWS, fakeNativeAd } from "../ads/testing";
import { forgetFeedMaps } from "../feed/FeedMaps";
import type { FeedItem } from "../feed/feedWithAds";
import { SAMPLE_FEED } from "../feed/sampleFeed";
import { PeopleContext } from "../social/peopleDoor";
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
  // Nothing else to touch but «Find friends» (TASK-215): no likes, no
  // comments (TASK-118).
  const [find, ...cards] = screen.getAllByRole("button");
  expect(find).toHaveAccessibleName("Find friends");
  expect(cards).toHaveLength(screen.getAllByTestId("feed-post").length);
  await fireEvent.press(cards[1]);
  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(onOpen).toHaveBeenCalledWith(second);
  await fireEvent.press(cards[0]);
  expect(onOpen).toHaveBeenLastCalledWith(first);
});

test("«Find friends» is above the drawings, and opens the search (TASK-215)", async () => {
  const open = jest.fn();
  await render(
    <PeopleContext.Provider value={{ open }}>
      <FeedScreen onOpen={noOpen} />
    </PeopleContext.Provider>,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Find friends" }));
  expect(open).toHaveBeenCalledTimes(1);
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

/** An ad network that gives an ad each time it is asked. */
function someAds(): FeedAds & { load: jest.Mock } {
  return {
    views: FAKE_AD_VIEWS,
    load: jest.fn(() => Promise.resolve(fakeNativeAd())),
  };
}

/** The rows of the list, as posts and ads: the list draws a few at a time. */
function rows(): string[] {
  const list = screen.getByTestId("feed-list");
  return (list.props.data as FeedItem<unknown, NativeAd>[]).map((item) => item.kind);
}

const posts = (n: number) => Array<string>(n).fill("post");

/** Tells the list that the post at `index` is on the screen. */
async function scrollTo(index: number) {
  const list = screen.getByTestId("feed-list");
  const item = (list.props.data as FeedItem<unknown, NativeAd>[]).find(
    (each) => each.kind === "post" && each.index === index,
  );
  await act(async () => {
    list.props.onViewableItemsChanged({ viewableItems: [{ item }], changed: [] });
  });
}

test("an ad after the fifth drawing, as the Feed opens (TASK-235)", async () => {
  const ads = someAds();
  await render(<FeedScreen onOpen={noOpen} ads={ads} />);
  expect(ads.load).toHaveBeenCalledTimes(1);
  expect(rows()).toEqual([...posts(5), "ad", ...posts(10)]);

  // The row of the ad is the ad's card, with «Sponsored».
  const list = screen.getByTestId("feed-list");
  const index = rows().indexOf("ad");
  await render(
    list.props.renderItem({ item: list.props.data[index], index }) as ReactElement,
  );
  expect(screen.getByTestId("feed-ad")).toBeOnTheScreen();
  expect(screen.getByText("Sponsored")).toBeOnTheScreen();
});

test("the next ad when the user reaches the first one's place, two in all", async () => {
  const ads = someAds();
  await render(<FeedScreen onOpen={noOpen} ads={ads} />);
  await scrollTo(3);
  expect(ads.load).toHaveBeenCalledTimes(1);
  // The sixth drawing, under the first ad.
  await scrollTo(5);
  expect(ads.load).toHaveBeenCalledTimes(2);
  expect(rows()).toEqual([...posts(5), "ad", ...posts(5), "ad", ...posts(5)]);
  // Fifteen drawings: nothing at the end.
  await scrollTo(14);
  expect(ads.load).toHaveBeenCalledTimes(2);
});

test("built behind «Draw», the Feed asks for no ad until it is on the screen", async () => {
  const ads = someAds();
  const { rerender } = await render(
    <FeedScreen onOpen={noOpen} ads={ads} active={false} />,
  );
  expect(ads.load).not.toHaveBeenCalled();
  expect(rows()).toEqual(posts(15));

  // Swiped to: the first ad.
  await rerender(<FeedScreen onOpen={noOpen} ads={ads} active />);
  expect(ads.load).toHaveBeenCalledTimes(1);
});

test("without an ad (Expo Go, no consent, no network) the drawings are all there is", async () => {
  const none: FeedAds = { views: FAKE_AD_VIEWS, load: () => Promise.resolve(null) };
  await render(<FeedScreen onOpen={noOpen} ads={none} />);
  expect(rows()).toEqual(posts(15));

  // In Expo Go: no ad network at all.
  await render(<FeedScreen onOpen={noOpen} />);
  expect(rows()).toEqual(posts(15));
  expect(screen.queryByTestId("feed-ad")).toBeNull();
});
