import drawing from "@shaperoute/shared-types/fixtures/drawing.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { DrawingDetail, Session } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";

import type { AccountState } from "../account/useAccount";
import { MessagesContext, type MessagesDoor } from "../messages/messagesDoor";
import { copySendable, DrawingCard } from "./DrawingCard";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// «Send to a friend» on a drawing opened on the map copies its whole track
// into a message (TASK-333, ADR-0289). The copy stays with whoever receives
// it, so it is offered for one's own drawing and for one every member sees,
// never for somebody else's drawing for its followers (TASK-455, ADR-0382,
// the user's choice 4).

const ME = (session as Session).user.public_id;
const signedIn: AccountState = { status: "signedIn", session: session as Session };
const SOMEBODY = {
  public_id: "1f2e3d4c-0000-4000-8000-0000000000c0",
  username: "cleo",
};
const MINE = drawing as DrawingDetail;

const door: MessagesDoor = {
  apiUrl: "http://api",
  account: { state: signedIn, sessionEnded: jest.fn() },
  screen: null,
  openList: jest.fn(),
  openConversation: jest.fn(),
  back: jest.fn(),
  close: jest.fn(),
  unread: { unread: 0, requests: 0 },
  recount: jest.fn(),
};

function forFollowers(of: DrawingDetail): DrawingDetail {
  return { ...of, public: false, visibility: "followers" };
}

async function shown(of: DrawingDetail) {
  await render(
    <MessagesContext.Provider value={door}>
      <DrawingCard drawing={of} onBack={jest.fn()} />
    </MessagesContext.Provider>,
  );
  return screen.queryByRole("button", { name: "Send to a friend" });
}

test("the example is a drawing of the account signed in", () => {
  expect(MINE.author.public_id).toBe(ME);
  expect(MINE.public).toBe(true);
});

test("one's own drawing is sent, for its followers too", async () => {
  expect(await shown(forFollowers(MINE))).toBeOnTheScreen();
});

test("somebody else's drawing for everyone is sent", async () => {
  expect(await shown({ ...MINE, author: SOMEBODY })).toBeOnTheScreen();
});

test("somebody else's drawing for its followers is not copied to anyone", async () => {
  expect(await shown(forFollowers({ ...MINE, author: SOMEBODY }))).toBeNull();
  // The rest of the card is as ever.
  expect(screen.getByRole("button", { name: "Export GPX" })).toBeOnTheScreen();
});

test("who is the account decides, never the name", () => {
  const theirs = forFollowers({ ...MINE, author: SOMEBODY });
  expect(copySendable(theirs, ME)).toBe(false);
  expect(copySendable(theirs, SOMEBODY.public_id)).toBe(true);
  expect(copySendable(theirs, null)).toBe(false);
  expect(copySendable({ ...theirs, public: true }, null)).toBe(true);
});
