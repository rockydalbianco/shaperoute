import drawingDetails from "@shaperoute/shared-types/fixtures/drawing-details.json";
import feed from "@shaperoute/shared-types/fixtures/feed.json";
import reactions from "@shaperoute/shared-types/fixtures/reactions.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type {
  FeedPost as Post,
  ReactionsSummary,
  Session,
} from "@shaperoute/shared-types";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import type { AccountState } from "../account/useAccount";
import { FollowsContext } from "../social/followsDoor";
import { withMine } from "../social/reactionKinds";
import { ReactionsContext, type ReactionsDoor } from "../social/reactionsDoor";
import { forgetFeedMaps } from "./FeedMaps";
import { shownPost } from "./feedPosts";
import { PostPage } from "./PostPage";
import { DOUBLE_TAP_MS } from "./useDoubleTap";

jest.mock("expo-file-system");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// Two taps on the drawing of the page of a post are its super like
// (TASK-454 part B); one tap waits, then opens it on the map as before.

const signedIn: AccountState = { status: "signedIn", session: session as Session };
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

async function show(post: Post, value: ReactionsDoor, onMap?: () => void) {
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: "http://api",
        account: { state: signedIn, sessionEnded: jest.fn() },
        openProfile: jest.fn(),
      }}
    >
      <ReactionsContext.Provider value={value}>
        <PostPage post={shownPost(post)} onClose={jest.fn()} onMap={onMap} />
      </ReactionsContext.Provider>
    </FollowsContext.Provider>,
  );
  await waitFor(() => expect(value.of).toHaveBeenCalled());
  await act(async () => {});
}

let fetchSpy: jest.SpyInstance;

beforeEach(() => {
  forgetFeedMaps();
  fetchSpy = jest
    .spyOn(global, "fetch")
    .mockImplementation(async () => Response.json({ ...drawingDetails, stats: null }));
});

afterEach(() => {
  fetchSpy.mockRestore();
});

/** Longer than a tap waits for a second one. */
const afterTheWait = () =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, DOUBLE_TAP_MS + 50)));

const sheet = () => screen.queryByRole("header", { name: "Super like" });

test("two taps on the drawing ask for the super like, and open no map", async () => {
  const onMap = jest.fn();
  const value = door(withMine(SUMMARY, null));
  await show(OTHERS, value, onMap);
  await fireEvent.press(screen.getByTestId("post-map"));
  await fireEvent.press(screen.getByTestId("post-map"));
  expect(await screen.findByRole("header", { name: "Super like" })).toBeOnTheScreen();
  expect(value.leave).not.toHaveBeenCalled();
  await afterTheWait();
  expect(onMap).not.toHaveBeenCalled();
});

test("one tap waits to know it is alone, then opens the drawing on the map", async () => {
  const onMap = jest.fn();
  await show(OTHERS, door(withMine(SUMMARY, null)), onMap);
  await fireEvent.press(screen.getByTestId("post-map"));
  expect(onMap).not.toHaveBeenCalled();
  await afterTheWait();
  expect(onMap).toHaveBeenCalledTimes(1);
  expect(sheet()).toBeNull();
});

test("the drawing is still a button with its name, for a screen reader", async () => {
  await show(OTHERS, door(withMine(SUMMARY, null)), jest.fn());
  expect(
    screen.getByRole("button", { name: "Sunday heart by the river" }),
  ).toBeOnTheScreen();
});

test("where the drawing opens nothing, two taps are the super like all the same", async () => {
  await show(OTHERS, door(withMine(SUMMARY, null)));
  expect(screen.queryByTestId("post-map")).toBeNull();
  const drawing = screen.getByTestId("post-map-taps");
  // Not a button: one tap does nothing, and a screen reader finds none.
  expect(drawing.props.accessible).toBe(false);
  await fireEvent.press(drawing);
  await fireEvent.press(drawing);
  expect(await screen.findByRole("header", { name: "Super like" })).toBeOnTheScreen();
});

test("on one's own post too", async () => {
  await show(MINE, door(withMine(SUMMARY, null)), jest.fn());
  await fireEvent.press(screen.getByTestId("post-map"));
  await fireEvent.press(screen.getByTestId("post-map"));
  expect(await screen.findByRole("header", { name: "Super like" })).toBeOnTheScreen();
});

test("with the super like already there: the heart, and nothing changes", async () => {
  const onMap = jest.fn();
  const value = door(withMine(SUMMARY, "super_like"));
  await show(OTHERS, value, onMap);
  await fireEvent.press(screen.getByTestId("post-map"));
  await fireEvent.press(screen.getByTestId("post-map"));
  expect(await screen.findByTestId("super-like-heart")).toBeOnTheScreen();
  expect(sheet()).toBeNull();
  expect(value.remove).not.toHaveBeenCalled();
  await afterTheWait();
  expect(onMap).not.toHaveBeenCalled();
});

test("without reactions to read two taps do nothing", async () => {
  const onMap = jest.fn();
  await show(OTHERS, door(null), onMap);
  await fireEvent.press(screen.getByTestId("post-map"));
  await fireEvent.press(screen.getByTestId("post-map"));
  await afterTheWait();
  expect(sheet()).toBeNull();
  expect(onMap).not.toHaveBeenCalled();
});
