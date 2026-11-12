import feed from "@shaperoute/shared-types/fixtures/feed.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { FeedPage, FeedPost, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Share } from "react-native";

import type { AccountState } from "../account/useAccount";
import { MessagesContext, type MessagesDoor } from "../messages/messagesDoor";
import { shownPost } from "./feedPosts";
import { PostActions } from "./PostActions";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("react-native/Libraries/Modal/Modal", () => ({
  __esModule: true,
  default: jest.requireActual("../messages/dismissingModal").default,
}));
// What the other rows of the sheet open is tested where it lives.
jest.mock("../messages/SendToFriend", () => ({ SendToFriend: () => null }));
jest.mock("../share/SharePost", () => ({ SharePost: () => null }));

// «Share link» in the sheet of «Share» under a post (TASK-455 part E,
// ADR-0382): only on a post the API says has a link, one's own or somebody
// else's; it hands the address to the phone's sheet and closes ours.

const signedIn: AccountState = { status: "signedIn", session: session as Session };
const FIRST = (feed as FeedPage).posts[0];
const LINKABLE: FeedPost = { ...FIRST, visibility: "everyone", linkable: true };
const LINK = `https://getmuw.app/p/#${FIRST.id}`;

function door(over: Partial<MessagesDoor> = {}): MessagesDoor {
  return {
    apiUrl: "http://api",
    account: { state: signedIn, sessionEnded: jest.fn() },
    screen: null,
    openList: jest.fn(),
    openConversation: jest.fn(),
    back: jest.fn(),
    close: jest.fn(),
    unread: { unread: 0, requests: 0 },
    recount: jest.fn(),
    ...over,
  };
}

function row(post: FeedPost, mine: boolean, value: MessagesDoor = door()) {
  return render(
    <MessagesContext.Provider value={value}>
      <PostActions post={shownPost(post)} mine={mine} />
    </MessagesContext.Provider>,
  );
}

/** The sheet's rows, in the order they are drawn. */
function rows() {
  return screen
    .getAllByText(/^(Send to a friend|Share link|Poster and video|Cancel)$/)
    .map((row) => row.props.children);
}

afterEach(() => jest.restoreAllMocks());

test("somebody else's linkable post: a friend, the link, never the poster", async () => {
  const share = jest
    .spyOn(Share, "share")
    .mockResolvedValue({ action: "sharedAction" });
  await row(LINKABLE, false);
  await fireEvent.press(screen.getByRole("button", { name: "Share" }));
  expect(screen.getByRole("button", { name: "Send to a friend" })).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Poster and video" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Share link" }));
  expect(share).toHaveBeenCalledWith({ message: LINK });
  // The sheet closes after the phone's: nothing is left open underneath.
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "Share link" })).toBeNull(),
  );
});

test("one's own linkable post has the three rows, the link between the two", async () => {
  jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });
  await row(LINKABLE, true);
  await fireEvent.press(screen.getByRole("button", { name: "Share" }));
  expect(rows()).toEqual([
    "Send to a friend",
    "Share link",
    "Poster and video",
    "Cancel",
  ]);
});

test.each([
  ["for its owner's followers", { ...FIRST, visibility: "followers", linkable: false }],
  [
    "of an owner with «Links to my posts» off",
    { ...FIRST, visibility: "everyone", linkable: false },
  ],
  ["read from an API of before the links", { ...FIRST, visibility: "everyone" }],
] as [string, FeedPost][])(
  "a post %s has no «Share link», its owner's included",
  async (_, post) => {
    const share = jest.spyOn(Share, "share");
    await row(post, true);
    await fireEvent.press(screen.getByRole("button", { name: "Share" }));
    expect(screen.getByRole("button", { name: "Poster and video" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Share link" })).toBeNull();
    expect(share).not.toHaveBeenCalled();
  },
);

test("without the messages a linkable post of somebody else still has «Share», for its link", async () => {
  await row(LINKABLE, false, door({ unread: null }));
  await fireEvent.press(screen.getByRole("button", { name: "Share" }));
  expect(screen.queryByRole("button", { name: "Send to a friend" })).toBeNull();
  expect(screen.getByRole("button", { name: "Share link" })).toBeOnTheScreen();
  // And one with no link and no friend to send it to has no «Share» at all.
  await screen.unmount();
  await row({ ...FIRST, visibility: "everyone" }, false, door({ unread: null }));
  expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
});
