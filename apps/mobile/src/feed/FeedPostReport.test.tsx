import feed from "@shaperoute/shared-types/fixtures/feed.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { FeedPost as Post, Session } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import type { AccountState } from "../account/useAccount";
import { forgetBlocked, markBlocked } from "../social/blockedNow";
import { FollowsContext } from "../social/followsDoor";
import { FeedPost } from "./FeedPost";
import { forgetFeedMaps } from "./FeedMaps";
import { shownPost } from "./feedPosts";
import type { SamplePost } from "./sampleFeed";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// The «…» of a post in «Feed» (TASK-121, ADR-0228): on another member's
// drawing, never on one's own or on an example; a member blocked is gone.

const URL = "http://api";
const signedIn: AccountState = { status: "signedIn", session: session as Session };
// The fixture's first post is the account's own (the session's public id).
const OWN = feed.posts[0] as Post;
const ADAM = {
  public_id: "3b9d2e10-7c4a-4f8e-a1d6-5e2f9c0b7a44",
  username: "adam.trento",
};
const OTHERS = { ...OWN, author: ADAM } as Post;
const EXAMPLE: SamplePost = {
  id: "firenze-dog_head-10000-4",
  user: "fede_km",
  title: "Dog walk, without the dog",
  city: "firenze",
  shape: "dog_head",
  route_m: 10514,
  minutes: 64,
  score: 92,
  line: [
    [43.77, 11.25],
    [43.77, 11.26],
  ],
};

async function show(post: SamplePost, state: AccountState = signedIn) {
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: URL,
        account: { state, sessionEnded: jest.fn() },
        openProfile: jest.fn(),
      }}
    >
      <FeedPost post={post} width={358} onOpen={jest.fn()} />
    </FollowsContext.Provider>,
  );
}

const menu = () => screen.queryByRole("button", { name: "More" });

beforeEach(() => {
  forgetFeedMaps();
  forgetBlocked();
});

test("another member's drawing has the «…»", async () => {
  await show(shownPost(OTHERS));
  expect(menu()).toBeOnTheScreen();
  await fireEvent.press(menu()!);
  expect(screen.getByRole("button", { name: "Report" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Block adam.trento" })).toBeOnTheScreen();
});

test("one's own drawing, an example, or nobody signed in: no «…»", async () => {
  await show(shownPost(OWN));
  expect(menu()).toBeNull();
  await show(EXAMPLE);
  expect(menu()).toBeNull();
  await show(shownPost(OTHERS), { status: "signedOut", notice: null });
  expect(menu()).toBeNull();
});

test("a member blocked leaves «Feed» at once", async () => {
  await show(shownPost(OTHERS));
  expect(screen.getByTestId("feed-post")).toBeOnTheScreen();
  await act(async () => markBlocked(ADAM.public_id));
  expect(screen.queryByTestId("feed-post")).toBeNull();
});
