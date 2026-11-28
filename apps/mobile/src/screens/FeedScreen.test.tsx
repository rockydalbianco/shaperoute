/**
 * «Feed» without the made-up examples (2026-11-22): without an account it
 * asks to log in; the ads and the maps, laid among the members' drawings.
 * The drawings themselves are in FeedScreenPosts.test.tsx.
 */
import page from "@shaperoute/shared-types/fixtures/feed.json";
import groupRuns from "@shaperoute/shared-types/fixtures/group-runs.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { FeedPost, Session } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { type ReactElement, type ReactNode } from "react";
import { StyleSheet } from "react-native";
import type { NativeAd } from "react-native-google-mobile-ads";

import type { FeedAds } from "../ads/feedAds";
import { FAKE_AD_VIEWS, fakeNativeAd } from "../ads/testing";
import { forgetFeedMaps } from "../feed/FeedMaps";
import { adSlots, type FeedItem } from "../feed/feedWithAds";
import { SAMPLE_FEED } from "../feed/sampleFeed";
import { forgetFeed } from "../feed/useFeed";
import { FollowsContext } from "../social/followsDoor";
import { FeedScreen } from "./FeedScreen";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const API = "http://api";
const [FIRST] = page.posts as FeedPost[];
/** How many drawings the members published: enough for three ads. */
const DRAWINGS = 15;
const POSTS: FeedPost[] = Array.from({ length: DRAWINGS }, (_, index) => ({
  ...FIRST,
  id: `post-${index}`,
  title: `Drawing ${index}`,
  rotation_deg: 0,
}));

let fetchSpy: jest.SpiedFunction<typeof fetch>;

beforeEach(() => {
  forgetFeed();
  fetchSpy = jest.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.startsWith(`${API}/feed`)) {
      return Response.json({ posts: POSTS, next: null, filter: "all" });
    }
    return Response.json(
      { error: { code: "http_error", message: url } },
      { status: 404 },
    );
  });
});

afterEach(() => {
  fetchSpy.mockRestore();
});

/** «Feed» with an account. */
function SignedIn({ children }: { children: ReactNode }) {
  return (
    <FollowsContext.Provider
      value={{
        apiUrl: API,
        account: {
          state: { status: "signedIn", session: session as Session },
          sessionEnded: () => {},
        },
        openProfile: () => {},
      }}
    >
      {children}
    </FollowsContext.Provider>
  );
}

function noOpen(): void {}

/** The page with an account, once the members' drawings are there. */
async function withDrawings(screenOf: ReactElement) {
  const shown = await render(<SignedIn>{screenOf}</SignedIn>);
  await screen.findByText("Drawing 0");
  return shown;
}

test("without an account, no made-up drawing: the page asks to log in", async () => {
  await render(<FeedScreen onOpen={noOpen} />);
  expect(screen.queryAllByTestId("feed-post")).toHaveLength(0);
  expect(screen.queryByText(SAMPLE_FEED[0].user)).toBeNull();
  expect(screen.queryByText(SAMPLE_FEED[0].title)).toBeNull();
  expect(screen.getByTestId("feed-log-in")).toBeOnTheScreen();
  expect(
    screen.getByText("Log in from Profile to see the activities."),
  ).toBeOnTheScreen();
  // Nothing to touch: no tabs, no «+».
  expect(screen.queryByRole("tab")).toBeNull();
});

test("no lens over the drawings: the search is at the top of «Explore» (TASK-367)", async () => {
  await render(<FeedScreen onOpen={noOpen} />);
  expect(screen.queryByRole("button", { name: "Search" })).toBeNull();
});

test("takes a picture of the map of each drawing, and lays it under its line", async () => {
  forgetFeedMaps();
  await withDrawings(<FeedScreen onOpen={noOpen} />);
  expect(screen.queryByTestId("feed-map")).toBeNull();

  // The page that takes the pictures: as large as a drawing, under the list.
  const mapPage = screen.getByTestId("feed-map-page", { includeHiddenElements: true });
  const [drawing] = screen.getAllByTestId("feed-drawing");
  const { width, height } = StyleSheet.flatten(drawing.props.style);
  expect(mapPage.parent).toHaveStyle({ width, height });

  await fireEvent(mapPage, "message", { nativeEvent: { data: '{"type":"ready"}' } });
  await fireEvent(mapPage, "message", {
    nativeEvent: {
      data: JSON.stringify({
        type: "shot",
        key: `${POSTS[0].id}:${width}x${height}`,
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
  await withDrawings(<FeedScreen onOpen={noOpen} ads={ads} />);
  expect(ads.load).toHaveBeenCalledTimes(1);
  expect(rows()).toEqual([...posts(5), "ad", ...posts(DRAWINGS - 5)]);

  // The row of the ad is the ad's card, with «Sponsored».
  const list = screen.getByTestId("feed-list");
  const index = rows().indexOf("ad");
  await render(
    list.props.renderItem({ item: list.props.data[index], index }) as ReactElement,
  );
  expect(screen.getByTestId("feed-ad")).toBeOnTheScreen();
  expect(screen.getByText("Sponsored")).toBeOnTheScreen();
});

test("the next ad when the user reaches the place of the one before", async () => {
  expect(DRAWINGS).toBeGreaterThan(10);
  const ads = someAds();
  await withDrawings(<FeedScreen onOpen={noOpen} ads={ads} />);
  await scrollTo(3);
  expect(ads.load).toHaveBeenCalledTimes(1);
  // The sixth drawing, under the first ad.
  await scrollTo(5);
  expect(ads.load).toHaveBeenCalledTimes(2);
  expect(rows()).toEqual([
    ...posts(5),
    "ad",
    ...posts(5),
    "ad",
    ...posts(DRAWINGS - 10),
  ]);

  // To the end: one ad every 5 drawings, none under the last.
  for (const place of adSlots(DRAWINGS)) {
    await scrollTo(place);
  }
  const slots = adSlots(DRAWINGS).length;
  expect(ads.load).toHaveBeenCalledTimes(slots);
  expect(rows().filter((row) => row === "ad")).toHaveLength(slots);
  expect(rows().at(-1)).toBe("post");
});

test("built behind «Draw», the Feed asks for no ad until it is on the screen", async () => {
  const ads = someAds();
  const { rerender } = await render(
    <SignedIn>
      <FeedScreen onOpen={noOpen} ads={ads} active={false} />
    </SignedIn>,
  );
  expect(ads.load).not.toHaveBeenCalled();
  expect(rows()).toEqual([]);

  // Swiped to: the drawings, and the first ad.
  await rerender(
    <SignedIn>
      <FeedScreen onOpen={noOpen} ads={ads} active />
    </SignedIn>,
  );
  await screen.findByText("Drawing 0");
  expect(ads.load).toHaveBeenCalledTimes(1);
});

test("without an ad (Expo Go, no consent, no network) the drawings are all there is", async () => {
  const none: FeedAds = { views: FAKE_AD_VIEWS, load: () => Promise.resolve(null) };
  await withDrawings(<FeedScreen onOpen={noOpen} ads={none} />);
  expect(rows()).toEqual(posts(DRAWINGS));

  // In Expo Go: no ad network at all.
  await withDrawings(<FeedScreen onOpen={noOpen} />);
  expect(rows()).toEqual(posts(DRAWINGS));
  expect(screen.queryByTestId("feed-ad")).toBeNull();
});

test("with an account, the row «Group runs» over the drawings; with a 404, none (TASK-309 B2)", async () => {
  const shown = await withDrawings(<FeedScreen onOpen={noOpen} />);
  // The API of before answers 404 to anything but the feed: as today.
  expect(screen.queryByTestId("group-runs-row")).toBeNull();
  await shown.unmount();

  forgetFeed();
  fetchSpy.mockImplementation(async (input) => {
    const url = String(input);
    if (url.startsWith(`${API}/feed`)) {
      return Response.json({ posts: POSTS, next: null, filter: "all" });
    }
    if (url.startsWith(`${API}/group-runs`)) {
      return Response.json(groupRuns);
    }
    return Response.json(
      { error: { code: "http_error", message: url } },
      { status: 404 },
    );
  });
  await withDrawings(<FeedScreen onOpen={noOpen} />);
  expect(await screen.findByTestId("group-runs-row")).toBeOnTheScreen();
  expect(screen.getByText(groupRuns.group_runs[0]!.title)).toBeOnTheScreen();
});
