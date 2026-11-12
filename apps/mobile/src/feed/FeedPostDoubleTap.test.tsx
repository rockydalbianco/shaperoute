import feed from "@shaperoute/shared-types/fixtures/feed.json";
import reactions from "@shaperoute/shared-types/fixtures/reactions.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type {
  FeedPost as Post,
  ReactionsSummary,
  Session,
} from "@shaperoute/shared-types";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react-native";

import { forgetBlocked } from "../social/blockedNow";
import { FollowsContext } from "../social/followsDoor";
import { withMine } from "../social/reactionKinds";
import { ReactionsContext, type ReactionsDoor } from "../social/reactionsDoor";
import { useReduceMotion } from "../ui/useReduceMotion";
import { FeedPost } from "./FeedPost";
import { forgetFeedMaps } from "./FeedMaps";
import { shownPost } from "./feedPosts";
import { SAMPLE_FEED } from "./sampleFeed";
import { DOUBLE_TAP_MS } from "./useDoubleTap";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("../ui/useReduceMotion");
const reduceMotion = jest.mocked(useReduceMotion);

// Two taps on the picture of a post in «Feed» are its super like (TASK-454
// part B, the user's choice of 2026-11-11); one tap waits to know it is
// alone, then opens what it opened.

const WIDTH = 358;
// The fixture's first post has one photo, and is the account's own.
const MINE = feed.posts[0] as Post;
const OTHERS = {
  ...MINE,
  author: {
    public_id: "3b9d2e10-7c4a-4f8e-a1d6-5e2f9c0b7a44",
    username: "adam.trento",
  },
} as Post;
/** fire 3, super_like 2, clap 1, wow 1; mine: fire. */
const SUMMARY = reactions as ReactionsSummary;

function door(read: ReactionsSummary | null): ReactionsDoor {
  return {
    of: jest.fn(async () =>
      read === null ? null : { kind: "ok" as const, value: read },
    ),
    leave: jest.fn(async () => null),
    remove: jest.fn(async () => null),
  };
}

async function show(post: Post, value: ReactionsDoor, onOpen?: () => void) {
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: "http://api",
        account: {
          state: { status: "signedIn", session: session as Session },
          sessionEnded: jest.fn(),
        },
        openProfile: jest.fn(),
      }}
    >
      <ReactionsContext.Provider value={value}>
        <FeedPost post={shownPost(post)} width={WIDTH} onOpen={onOpen} />
      </ReactionsContext.Provider>
    </FollowsContext.Provider>,
  );
  // The reactions read, or the answer that there are none.
  await waitFor(() => expect(value.of).toHaveBeenCalled());
  await act(async () => {});
}

beforeEach(() => {
  forgetFeedMaps();
  forgetBlocked();
  reduceMotion.mockReturnValue(false);
});

const pages = () =>
  within(screen.getByTestId("feed-pages")).getAllByTestId("feed-page-tap");
const at = (pageX: number, pageY: number) => ({ nativeEvent: { pageX, pageY } });

/** A tap as a finger gives it: down, then up where it came down. */
async function tapOn(page: number) {
  await fireEvent(pages()[page], "pressIn", at(200, 300));
  await fireEvent.press(pages()[page], at(202, 301));
}

/** The photos scrolled to the first photo: its page is the one shown. */
const toThePhoto = () =>
  act(() =>
    fireEvent(screen.getByTestId("feed-pages"), "momentumScrollEnd", {
      nativeEvent: { contentOffset: { x: WIDTH, y: 0 } },
    }),
  );

/** Longer than a tap waits for a second one. */
const afterTheWait = () =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, DOUBLE_TAP_MS + 50)));

const sheet = () => screen.queryByRole("header", { name: "Super like" });

test("two taps on the drawing ask for the super like, and open nothing", async () => {
  const onOpen = jest.fn();
  const value = door(withMine(SUMMARY, null));
  await show(OTHERS, value, onOpen);
  await tapOn(0);
  await tapOn(0);
  expect(await screen.findByRole("header", { name: "Super like" })).toBeOnTheScreen();
  // Nothing left before its comment went, and neither tap opened the post.
  expect(value.leave).not.toHaveBeenCalled();
  await afterTheWait();
  expect(onOpen).not.toHaveBeenCalled();
});

test("two taps on a photo too, and the photo stays where it is", async () => {
  const onOpen = jest.fn();
  await show(OTHERS, door(withMine(SUMMARY, null)), onOpen);
  await toThePhoto();
  await tapOn(1);
  await tapOn(1);
  expect(await screen.findByRole("header", { name: "Super like" })).toBeOnTheScreen();
  await afterTheWait();
  expect(screen.queryByTestId("feed-photo-viewer")).toBeNull();
  expect(onOpen).not.toHaveBeenCalled();
});

test("one tap waits to know it is alone, then opens the post", async () => {
  const onOpen = jest.fn();
  await show(OTHERS, door(withMine(SUMMARY, null)), onOpen);
  await tapOn(0);
  expect(onOpen).not.toHaveBeenCalled();
  await afterTheWait();
  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(sheet()).toBeNull();
});

test("one tap on a photo opens it on the whole screen, after the wait", async () => {
  await show(OTHERS, door(withMine(SUMMARY, null)), jest.fn());
  await toThePhoto();
  await tapOn(1);
  expect(screen.queryByTestId("feed-photo-viewer")).toBeNull();
  await afterTheWait();
  expect(screen.getByTestId("feed-photo-viewer")).toBeOnTheScreen();
});

test("two taps far apart in time are two taps", async () => {
  const onOpen = jest.fn();
  await show(OTHERS, door(withMine(SUMMARY, null)), onOpen);
  await tapOn(0);
  await afterTheWait();
  await tapOn(0);
  await afterTheWait();
  expect(onOpen).toHaveBeenCalledTimes(2);
  expect(sheet()).toBeNull();
});

test("the end of a swipe is not one of the two", async () => {
  const onOpen = jest.fn();
  await show(OTHERS, door(withMine(SUMMARY, null)), onOpen);
  await tapOn(0);
  await fireEvent(pages()[0], "pressIn", at(80, 300));
  await fireEvent.press(pages()[0], at(340, 300));
  await afterTheWait();
  expect(sheet()).toBeNull();
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test("on one's own post too, as the heart of the bar there", async () => {
  const value = door(withMine(SUMMARY, null));
  await show(MINE, value, jest.fn());
  await tapOn(0);
  await tapOn(0);
  expect(await screen.findByRole("header", { name: "Super like" })).toBeOnTheScreen();
  expect(value.leave).not.toHaveBeenCalled();
});

test("with the super like already there: the heart, and nothing changes", async () => {
  const onOpen = jest.fn();
  const value = door(withMine(SUMMARY, "super_like"));
  await show(OTHERS, value, onOpen);
  await tapOn(0);
  await tapOn(0);
  expect(await screen.findByTestId("super-like-heart")).toBeOnTheScreen();
  expect(sheet()).toBeNull();
  expect(value.remove).not.toHaveBeenCalled();
  expect(value.leave).not.toHaveBeenCalled();
  await afterTheWait();
  expect(onOpen).not.toHaveBeenCalled();
});

test("with «Reduce Motion» two taps ask the same, and one opens the same", async () => {
  reduceMotion.mockReturnValue(true);
  const onOpen = jest.fn();
  await show(OTHERS, door(withMine(SUMMARY, null)), onOpen);
  await tapOn(0);
  await afterTheWait();
  expect(onOpen).toHaveBeenCalledTimes(1);
  await tapOn(0);
  await tapOn(0);
  expect(await screen.findByRole("header", { name: "Super like" })).toBeOnTheScreen();
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test("without reactions to read two taps do nothing", async () => {
  const onOpen = jest.fn();
  await show(OTHERS, door(null), onOpen);
  await tapOn(0);
  await tapOn(0);
  await afterTheWait();
  expect(sheet()).toBeNull();
  expect(screen.queryByTestId("super-like-heart")).toBeNull();
  expect(onOpen).not.toHaveBeenCalled();
});

test("an example has no reactions: its tap does not wait", async () => {
  const onOpen = jest.fn();
  await render(<FeedPost post={SAMPLE_FEED[0]!} width={WIDTH} onOpen={onOpen} />);
  const card = screen.getByTestId("feed-post");
  await fireEvent(card, "pressIn", at(200, 300));
  await fireEvent.press(card, at(202, 301));
  expect(onOpen).toHaveBeenCalledTimes(1);
});
