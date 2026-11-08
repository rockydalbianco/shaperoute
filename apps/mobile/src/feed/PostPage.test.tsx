import feed from "@shaperoute/shared-types/fixtures/feed.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { FeedPost as Post, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen, within } from "@testing-library/react-native";

import type { AccountState } from "../account/useAccount";
import { FollowsContext } from "../social/followsDoor";
import { EditRunContext } from "./editRunDoor";
import { forgetFeedMaps } from "./FeedMaps";
import { shownPost } from "./feedPosts";
import { PostPage } from "./PostPage";

jest.mock("expo-file-system");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// The page of a post (TASK-410, ADR-0340): who, the drawing still, the
// summary with what there is, and the bar of four at its foot.

const URL = "http://api";
const signedIn: AccountState = { status: "signedIn", session: session as Session };
const MINE = feed.posts[0] as Post;
const OTHERS = {
  ...MINE,
  author: {
    public_id: "3b9d2e10-7c4a-4f8e-a1d6-5e2f9c0b7a44",
    username: "adam.trento",
  },
} as Post;

async function show(post: Post, edit = jest.fn()) {
  const onClose = jest.fn();
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: URL,
        account: { state: signedIn, sessionEnded: jest.fn() },
        openProfile: jest.fn(),
      }}
    >
      <EditRunContext.Provider value={(line) => (line.length >= 2 ? edit : undefined)}>
        <PostPage post={shownPost(post)} onClose={onClose} />
      </EditRunContext.Provider>
    </FollowsContext.Provider>,
  );
  return { onClose, edit };
}

beforeEach(() => {
  forgetFeedMaps();
});

test("the author's letter at the top, as big as the page wants", async () => {
  await show(OTHERS);
  expect(screen.getByText("adam.trento")).toBeOnTheScreen();
  // No picture before TASK-355 B: the letter.
  expect(screen.getByText("A")).toBeOnTheScreen();
  expect(screen.queryByTestId("avatar-photo")).toBeNull();
});

test("the title, the description and the summary of what there is", async () => {
  await show(OTHERS);
  expect(screen.getByText("Sunday heart by the river")).toBeOnTheScreen();
  expect(screen.getByText(/Legs heavy after the bridge/)).toBeOnTheScreen();
  const summary = within(screen.getByTestId("post-summary"));
  expect(summary.getByText("Summary")).toBeOnTheScreen();
  expect(summary.getByText("4.00 km")).toBeOnTheScreen();
  expect(summary.getByText("19:00")).toBeOnTheScreen();
  expect(summary.getByText("4:45 /km")).toBeOnTheScreen();
  // An old post has no splits, no climb, no heart: no cards for them.
  expect(screen.queryByText("Splits")).toBeNull();
  expect(screen.queryByText("Heart rate")).toBeNull();
});

test("on somebody else's post: like, edit & run, no share and no settings", async () => {
  const { edit } = await show(OTHERS);
  expect(screen.getByTestId("post-like")).toBeOnTheScreen();
  expect(screen.queryByTestId("post-share")).toBeNull();
  expect(screen.queryByTestId("post-sheet-handle")).toBeNull();
  await fireEvent.press(screen.getByTestId("post-edit-run"));
  expect(edit).toHaveBeenCalledTimes(1);
});

test("on one's own post: share, and the handle of the settings", async () => {
  await show(MINE);
  expect(screen.getByTestId("post-share")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Post settings" })).toBeOnTheScreen();
  expect(screen.queryByTestId("post-settings")).toBeNull();
});

test("«Like» opens the six reactions over the bar, and closes them", async () => {
  await show(OTHERS);
  expect(screen.queryByTestId("post-reactions")).toBeNull();
  await fireEvent.press(screen.getByTestId("post-like"));
  expect(screen.getByTestId("post-reactions")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("post-like"));
  expect(screen.queryByTestId("post-reactions")).toBeNull();
});

test("on the snow and at the gym no «Edit & run»", async () => {
  await show({ ...OTHERS, activity: "skiing" });
  expect(screen.queryByTestId("post-edit-run")).toBeNull();
});

test("«Back» closes the page", async () => {
  const { onClose } = await show(OTHERS);
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});
