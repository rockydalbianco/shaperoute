import feed from "@shaperoute/shared-types/fixtures/feed.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { FeedPost as Post, OutfitTag, Session } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import type { AccountState } from "../account/useAccount";
import { forgetBlocked } from "../social/blockedNow";
import { FollowsContext } from "../social/followsDoor";
import { FeedPost } from "./FeedPost";
import { forgetFeedMaps } from "./FeedMaps";
import { shownPost } from "./feedPosts";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// The items a member tagged on a photo of its post, in «Feed» (TASK-394
// part B): the hanger on the photo, which shows the dots and leaves the
// drawing closed (the user's choice of 2026-11-06), the same place after
// the photos were ordered, and the totals under the photos to the author.

const URL = "http://api";
const WIDTH = 358;
const signedIn: AccountState = { status: "signedIn", session: session as Session };
const BASE = feed.posts[0] as Post;
const SHOES: OutfitTag = {
  id: "t1",
  x: 0.5,
  y: 0.8,
  item: "shoes",
  brand: "Nike",
  product_name: null,
  store: "nike.com",
  url: null,
  hidden: false,
  opens: null,
  shops: null,
};
const withTags = (tags: OutfitTag[], order?: string[]): Post => ({
  ...BASE,
  photos: (BASE.photos ?? []).map((photo) => ({ ...photo, outfit_tags: tags })),
  ...(order === undefined ? {} : { order }),
});

async function show(post: Post, onOpen = jest.fn()) {
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: URL,
        account: { state: signedIn, sessionEnded: jest.fn() },
        openProfile: jest.fn(),
      }}
    >
      <FeedPost post={shownPost(post)} width={WIDTH} onOpen={onOpen} />
    </FollowsContext.Provider>,
  );
  return onOpen;
}

beforeEach(() => {
  forgetFeedMaps();
  forgetBlocked();
});

test("a photo with items has the hanger; it shows the dots and opens nothing", async () => {
  const onOpen = await show(withTags([SHOES]));
  const hanger = screen.getByRole("button", { name: "1 item tagged" });
  await act(() =>
    fireEvent(screen.getByTestId("outfit-layer"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: WIDTH, height: 400 } },
    }),
  );
  await fireEvent.press(hanger);
  expect(screen.getByRole("button", { name: "Shoes, Nike" })).toBeOnTheScreen();
  expect(onOpen).not.toHaveBeenCalled();
});

test("the photo first in the post keeps its items", async () => {
  await show(withTags([SHOES], ["photo:1", "drawing"]));
  expect(screen.getByTestId("outfit-hanger")).toBeOnTheScreen();
});

test("a photo without items has no hanger, and nobody but the author has totals", async () => {
  await show(withTags([]));
  expect(screen.queryByTestId("outfit-hanger")).toBeNull();
  expect(screen.queryByTestId("outfit-totals")).toBeNull();
  await screen.unmount();
  await show(withTags([SHOES]));
  expect(screen.queryByTestId("outfit-totals")).toBeNull();
});

test("under the author's photos, the totals of its items", async () => {
  await show(withTags([{ ...SHOES, url: "https://nike.com/p", opens: 15, shops: 3 }]));
  expect(screen.getByText("Your items · Opens: 15 · To the shop: 3")).toBeOnTheScreen();
});
