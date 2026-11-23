/**
 * The post of a night of sleep in «Feed» and in a grid of drawings
 * (TASK-467 part E): the night where a run has its map, the actions under
 * it, and nothing while the sleep is off.
 */
import type { Session } from "@shaperoute/shared-types";
import session from "@shaperoute/shared-types/fixtures/session.json";
import summary from "@shaperoute/shared-types/fixtures/sleep-summary.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import type { AccountState } from "../account/useAccount";
import { sleepPostsOn } from "../health/sleepModules";
import { MessagesContext, type MessagesDoor } from "../messages/messagesDoor";
import { FollowsContext } from "../social/followsDoor";
import { shownPost } from "./feedPosts";
import { SLEEP_FEED_POST_TEST_ID, SleepFeedPost } from "./SleepFeedPost";
import { isSleepPost } from "./sleepPost";
import { sleepFeedPost } from "./sleepPost.testing";
import { SLEEP_TILE_TEST_ID, SleepTile } from "./SleepTile";
import { DOUBLE_TAP_MS } from "./useDoubleTap";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("../health/sleepModules", () => ({
  ...jest.requireActual("../health/sleepModules"),
  sleepPostsOn: jest.fn(() => true),
}));

const on = jest.mocked(sleepPostsOn);
const API = "http://api";
const signedIn = session as Session;
const SIGNED_IN: AccountState = { status: "signedIn", session: signedIn };
/** The tile is hidden from a screen reader: found only when asked so. */
const HIDDEN = { includeHiddenElements: true };

function messages(): MessagesDoor {
  return {
    apiUrl: API,
    account: { state: SIGNED_IN, sessionEnded: jest.fn() },
    screen: null,
    openList: jest.fn(),
    openConversation: jest.fn(),
    back: jest.fn(),
    close: jest.fn(),
    unread: { unread: 0, requests: 0 },
    recount: jest.fn(),
  };
}

function around(children: React.ReactNode, openProfile = jest.fn()) {
  return (
    <MessagesContext.Provider value={messages()}>
      <FollowsContext.Provider
        value={{
          apiUrl: API,
          account: { state: SIGNED_IN, sessionEnded: () => {} },
          openProfile,
        }}
      >
        {children}
      </FollowsContext.Provider>
    </MessagesContext.Provider>
  );
}

beforeEach(() => {
  on.mockReturnValue(true);
});

afterEach(() => {
  jest.useRealTimers();
});

test("a post is told apart by its source, as a post of photos only", () => {
  expect(isSleepPost(sleepFeedPost())).toBe(true);
  expect(isSleepPost({ source: "photos" })).toBe(false);
  expect(isSleepPost({ source: "muw" })).toBe(false);
  expect(isSleepPost({})).toBe(false);
  expect(isSleepPost({ source: null })).toBe(false);
});

test("the card shows who, the night and the actions; no map, no numbers of a run", async () => {
  await render(
    around(<SleepFeedPost post={shownPost(sleepFeedPost())} onOpen={() => {}} />),
  );
  expect(screen.getByTestId(SLEEP_FEED_POST_TEST_ID)).toBeTruthy();
  expect(screen.getByText("ada")).toBeTruthy();
  expect(screen.getByText("Sleep score")).toBeTruthy();
  expect(screen.getByText("82 · Very good")).toBeTruthy();
  expect(screen.getByText("7 h 32 min")).toBeTruthy();
  expect(screen.getByLabelText("Deep: 1 h 12 min")).toBeTruthy();
  expect(screen.getByTestId("post-like")).toBeTruthy();
  // No distance, no pace, and never an hour of going to bed or of waking.
  expect(screen.queryByText(/km/)).toBeNull();
  expect(screen.queryByText(/\d{1,2}:\d{2}/)).toBeNull();
  expect(screen.queryByText(/Apple/)).toBeNull();
});

test("one tap on the night opens the page, once the wait for a second is over", async () => {
  jest.useFakeTimers();
  const onOpen = jest.fn();
  await render(
    around(<SleepFeedPost post={shownPost(sleepFeedPost())} onOpen={onOpen} />),
  );
  await fireEvent.press(screen.getByTestId("feed-post"));
  expect(onOpen).not.toHaveBeenCalled();
  await act(async () => {
    jest.advanceTimersByTime(DOUBLE_TAP_MS + 1);
  });
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test("a tap on the author opens the profile", async () => {
  const openProfile = jest.fn();
  const post = sleepFeedPost();
  await render(
    around(<SleepFeedPost post={shownPost(post)} onOpen={() => {}} />, openProfile),
  );
  await fireEvent.press(screen.getByTestId("feed-author"));
  expect(openProfile).toHaveBeenCalledWith({
    public_id: post.author.public_id,
    username: "ada",
    photo: null,
  });
});

test("off: nothing of the post is drawn", async () => {
  on.mockReturnValue(false);
  await render(
    around(<SleepFeedPost post={shownPost(sleepFeedPost())} onOpen={() => {}} />),
  );
  expect(screen.toJSON()).toBeNull();
});

test("a post whose night cannot be read is not drawn", async () => {
  await render(
    around(
      <SleepFeedPost
        post={shownPost(sleepFeedPost({ sleep: null }))}
        onOpen={() => {}}
      />,
    ),
  );
  expect(screen.queryByTestId(SLEEP_FEED_POST_TEST_ID)).toBeNull();
});

test("the tile of a grid says the score over «Sleep», hidden from a screen reader", async () => {
  await render(<SleepTile sleep={summary} size={110} />);
  const tile = screen.getByTestId(SLEEP_TILE_TEST_ID, HIDDEN);
  expect(tile.props.accessibilityElementsHidden).toBe(true);
  expect(screen.getByText("82", HIDDEN)).toBeTruthy();
  expect(screen.getByText("Sleep", HIDDEN)).toBeTruthy();
  // A screen reader hears the cell's words, not the tile's.
  expect(screen.queryByText("82")).toBeNull();
});

test("off, or without a night, the tile is an empty square", async () => {
  on.mockReturnValue(false);
  await render(<SleepTile sleep={summary} size={110} />);
  expect(screen.getByTestId(SLEEP_TILE_TEST_ID, HIDDEN)).toBeTruthy();
  expect(screen.queryByText("82", HIDDEN)).toBeNull();
  await screen.unmount();
  on.mockReturnValue(true);
  await render(<SleepTile sleep={null} size={110} />);
  expect(screen.getByTestId(SLEEP_TILE_TEST_ID, HIDDEN)).toBeTruthy();
  expect(screen.queryByText("Sleep", HIDDEN)).toBeNull();
});
