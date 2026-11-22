/**
 * The author's picture in a card of «Feed» (TASK-355 part B): at its own
 * address on the API, read with the token and the key; the grey initial
 * without one, and on an example.
 */
import counted from "@shaperoute/shared-types/fixtures/feed-counts.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { FeedPost as Post, Session } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";

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

const URL = "http://api";
const signedIn: AccountState = { status: "signedIn", session: session as Session };
const [WITH_PHOTO, WITHOUT] = counted.posts as unknown as Post[];

async function show(post: Post) {
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: URL,
        account: { state: signedIn, sessionEnded: jest.fn() },
        openProfile: jest.fn(),
      }}
    >
      <FeedPost post={shownPost(post)} width={358} onOpen={jest.fn()} />
    </FollowsContext.Provider>,
  );
}

beforeEach(() => {
  forgetFeedMaps();
  forgetBlocked();
});

test("a picture comes from its address, with the token", async () => {
  await show(WITH_PHOTO!);
  const photo = await screen.findByTestId("feed-author-photo");
  expect(photo.props.source).toMatchObject({
    uri: `${URL}${WITH_PHOTO!.author.photo}`,
    headers: { Authorization: `Bearer ${session.token}` },
  });
});

test("without one, the initial", async () => {
  await show(WITHOUT!);
  expect(screen.queryByTestId("feed-author-photo")).toBeNull();
  expect(
    screen.getByText(WITHOUT!.author.username.charAt(0).toUpperCase()),
  ).toBeTruthy();
});
