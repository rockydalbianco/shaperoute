import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { AccountState } from "../account/useAccount";
import type { PostToSend } from "../messages/messagePost";
import { MessagesContext, type MessagesDoor } from "../messages/messagesDoor";
import type { PostRun } from "../share/postRun";
import { PostShareSheet } from "./PostShareSheet";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("react-native/Libraries/Modal/Modal", () => ({
  __esModule: true,
  default: jest.requireActual("../messages/dismissingModal").default,
}));
// What each row opens is tested where it lives: here, that it opens.
jest.mock("../messages/SendToFriend", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    SendToFriend: ({ post }: { post: { id: string } }) => (
      <Text>{`send post ${post.id}`}</Text>
    ),
  };
});
jest.mock("../share/SharePost", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    SharePost: ({ run }: { run: { title: string | null } }) => (
      <Text>{`poster of ${run.title}`}</Text>
    ),
  };
});

// «Share» under a post (TASK-455, the user's choice 2): a small sheet with
// «Send to a friend» and, on one's own post, «Poster and video».

const signedIn: AccountState = { status: "signedIn", session: session as Session };
const POST: PostToSend = {
  id: "0b7e5a94-6c1d-4f38-8e2a-9d4c1f6b3a57",
  author: { public_id: "c2a9f4d1-5e7b-4a63-b0d8-1f3e6a9c7b24", username: "cleo" },
  everyone: true,
};
const RUN = { key: null, title: "Sunday star", track: [] } as unknown as PostRun;

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

function sheet(value: MessagesDoor, poster?: () => PostRun, onClose = jest.fn()) {
  return render(
    <MessagesContext.Provider value={value}>
      <PostShareSheet visible post={POST} poster={poster} onClose={onClose} />
    </MessagesContext.Provider>,
  );
}

test("somebody else's post is sent to a friend, and has no poster", async () => {
  await sheet(door());
  expect(screen.getByRole("button", { name: "Send to a friend" })).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Poster and video" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Send to a friend" }));
  expect(screen.getByText(`send post ${POST.id}`)).toBeOnTheScreen();
});

test("one's own post has «Poster and video» too, made when it is touched", async () => {
  const poster = jest.fn(() => RUN);
  await sheet(door(), poster);
  expect(poster).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Poster and video" }));
  expect(screen.getByText("poster of Sunday star")).toBeOnTheScreen();
});

test("without the messages there is no friend to send it to", async () => {
  await sheet(door({ unread: null }), () => RUN);
  expect(screen.queryByRole("button", { name: "Send to a friend" })).toBeNull();
  expect(screen.getByRole("button", { name: "Poster and video" })).toBeOnTheScreen();
});

test("«Cancel» closes the sheet", async () => {
  const onClose = jest.fn();
  await sheet(door(), undefined, onClose);
  await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
  expect(onClose).toHaveBeenCalled();
});
