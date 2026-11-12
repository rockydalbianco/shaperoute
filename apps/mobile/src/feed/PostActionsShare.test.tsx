import feed from "@shaperoute/shared-types/fixtures/feed.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { FeedPage, FeedPost, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

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
// What each row of the sheet opens is tested where it lives.
jest.mock("../messages/SendToFriend", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    SendToFriend: ({ post }: { post: { id: string; everyone: boolean } }) => (
      <Text>{`send post ${post.id} ${post.everyone ? "everyone" : "followers"}`}</Text>
    ),
  };
});
jest.mock("../share/SharePost", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    SharePost: ({ run }: { run: { drawingId?: string } }) => (
      <Text>{`poster of ${run.drawingId}`}</Text>
    ),
  };
});

// «Share» under a post (TASK-455, ADR-0382, the user's choice 2 of
// 2026-11-12): on every post, a small sheet. Somebody else's post is sent
// to a friend, as a pointer; one's own has «Poster and video» too, what
// «Share» opened before. PostActions.test.tsx has the row without the
// messages, where «Share» stays on one's own posts alone.

const signedIn: AccountState = { status: "signedIn", session: session as Session };
// The first post of the example, for everyone whatever the example says.
const POST: FeedPost = { ...(feed as FeedPage).posts[0], visibility: "everyone" };

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

test("somebody else's post has «Share»: it is sent to a friend, never made a poster", async () => {
  await row(POST, false);
  // The sheet is made at the first «Share».
  expect(screen.queryByRole("button", { name: "Send to a friend" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Share" }));
  expect(screen.queryByRole("button", { name: "Poster and video" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Send to a friend" }));
  expect(screen.getByText(`send post ${POST.id} everyone`)).toBeOnTheScreen();
});

test("a post for its owner's followers is sent as one", async () => {
  await row({ ...POST, visibility: "followers" }, false);
  await fireEvent.press(screen.getByRole("button", { name: "Share" }));
  await fireEvent.press(screen.getByRole("button", { name: "Send to a friend" }));
  expect(screen.getByText(`send post ${POST.id} followers`)).toBeOnTheScreen();
});

test("one's own post has both: a friend, and the poster «Share» opened before", async () => {
  await row(POST, true);
  await fireEvent.press(screen.getByRole("button", { name: "Share" }));
  expect(screen.getByRole("button", { name: "Send to a friend" })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Poster and video" }));
  expect(screen.getByText(`poster of ${POST.id}`)).toBeOnTheScreen();
});

test("without the messages somebody else's post has no «Share», one's own still has", async () => {
  await row(POST, false, door({ unread: null }));
  expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
  await row(POST, true, door({ unread: null }));
  await fireEvent.press(screen.getByRole("button", { name: "Share" }));
  expect(screen.queryByRole("button", { name: "Send to a friend" })).toBeNull();
  expect(screen.getByRole("button", { name: "Poster and video" })).toBeOnTheScreen();
});

test("«Cancel» closes the sheet, and «Share» opens it again", async () => {
  await row(POST, true);
  await fireEvent.press(screen.getByRole("button", { name: "Share" }));
  await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
  await fireEvent.press(screen.getByRole("button", { name: "Share" }));
  expect(screen.getByRole("button", { name: "Poster and video" })).toBeOnTheScreen();
});
