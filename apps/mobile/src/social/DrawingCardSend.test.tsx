import drawing from "@shaperoute/shared-types/fixtures/drawing.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { DrawingDetail, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { AccountState } from "../account/useAccount";
import { postOfDrawing } from "../messages/messagePost";
import { MessagesContext, type MessagesDoor } from "../messages/messagesDoor";
import { SendToFriend } from "../messages/SendToFriend";
import { copySendable, DrawingCard } from "./DrawingCard";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("react-native/Libraries/Modal/Modal", () => ({
  __esModule: true,
  default: jest.requireActual("../messages/dismissingModal").default,
}));

// «Send to a friend» on a drawing opened on the map. One's own drawing is
// copied into the message, its whole track (TASK-333, ADR-0289). Somebody
// else's is never copied (TASK-455, ADR-0382, the user's choices 3 and 4):
// it goes as a post, a pointer that opens only for who may see the drawing,
// so one for its owner's followers can be sent too.

const URL = "http://api";
const ME = (session as Session).user.public_id ?? null;
const signedIn: AccountState = { status: "signedIn", session: session as Session };
const SOMEBODY = {
  public_id: "1f2e3d4c-0000-4000-8000-0000000000c0",
  username: "cleo",
};
const BOB = {
  public_id: "1f2e3d4c-0000-4000-8000-0000000000b0",
  username: "bob",
  photo: null,
};
const MINE = drawing as DrawingDetail;

function forFollowers(of: DrawingDetail): DrawingDetail {
  return { ...of, public: false, visibility: "followers" };
}

type Asked = { method: string; url: string; body: unknown };

/** A fake API: Bob among who one follows, and every message kept. */
function api() {
  const asked: Asked[] = [];
  const fetchFn = jest.fn(async (input: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const url = input.replace(URL, "");
    asked.push({
      method,
      url,
      body: typeof init?.body === "string" ? JSON.parse(init.body) : null,
    });
    const answer = url.startsWith("/me/conversations")
      ? { conversations: [], next: null, total: 0 }
      : url.startsWith("/me/following")
        ? { people: [BOB], next: null, total: 1 }
        : {
            id: "3f0d6c1a-7b42-4e85-9a13-5d8e2c704b96",
            text: "",
            created_at: "2026-11-12T08:15:30Z",
            mine: true,
            attachment: null,
          };
    return new Response(JSON.stringify(answer), {
      status: method === "POST" ? 201 : 200,
    });
  }) as unknown as typeof fetch;
  return { asked, fetchFn };
}

function door(): MessagesDoor {
  return {
    apiUrl: URL,
    account: { state: signedIn, sessionEnded: jest.fn() },
    screen: null,
    openList: jest.fn(),
    openConversation: jest.fn(),
    back: jest.fn(),
    close: jest.fn(),
    unread: { unread: 0, requests: 0 },
    recount: jest.fn(),
  };
}

async function shown(of: DrawingDetail) {
  await render(
    <MessagesContext.Provider value={door()}>
      <DrawingCard drawing={of} onBack={jest.fn()} />
    </MessagesContext.Provider>,
  );
  return screen.queryByRole("button", { name: "Send to a friend" });
}

test("the example is a drawing of the account signed in", () => {
  expect(MINE.author.public_id).toBe(ME);
  expect(MINE.public).toBe(true);
});

test("the button is on one's own drawing and on somebody else's, whoever sees it", async () => {
  expect(await shown(forFollowers(MINE))).toBeOnTheScreen();
  expect(await shown({ ...MINE, author: SOMEBODY })).toBeOnTheScreen();
  expect(await shown(forFollowers({ ...MINE, author: SOMEBODY }))).toBeOnTheScreen();
});

test("only one's own drawing is copied: who is the account decides", () => {
  const theirs = forFollowers({ ...MINE, author: SOMEBODY });
  expect(copySendable(theirs, ME)).toBe(false);
  const forEveryone: DrawingDetail = { ...theirs, public: true };
  expect(copySendable(forEveryone, ME)).toBe(false);
  expect(copySendable(theirs, SOMEBODY.public_id)).toBe(true);
  expect(copySendable(MINE, null)).toBe(false);
});

test("somebody else's drawing for its followers goes as a pointer, with a word of warning", async () => {
  const { asked, fetchFn } = api();
  const theirs = forFollowers({ ...MINE, author: SOMEBODY });
  // The button of the card has no fake fetch to hand down: the sheet it
  // opens is rendered here with one, as the card renders it.
  await render(
    <MessagesContext.Provider value={door()}>
      <SendToFriend
        post={postOfDrawing(theirs)}
        onClose={jest.fn()}
        fetchFn={fetchFn}
        apiKey={null}
      />
    </MessagesContext.Provider>,
  );
  expect(
    await screen.findByText("Only people who follow cleo can open it."),
  ).toBeOnTheScreen();
  await fireEvent.press(await screen.findByRole("button", { name: "bob" }));
  expect(await screen.findByText("Sent to bob.")).toBeOnTheScreen();
  const sent = asked.find((call) => call.method === "POST");
  // The id and nothing of the drawing: no line leaves the phone.
  expect(sent?.body).toEqual({ text: "", attachment: { post_id: theirs.id } });
  expect(JSON.stringify(sent?.body)).not.toContain("points");
});
