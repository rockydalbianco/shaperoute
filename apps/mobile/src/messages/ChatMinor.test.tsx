import postExample from "@shaperoute/shared-types/fixtures/message-post.json";
import messagesExample from "@shaperoute/shared-types/fixtures/messages.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { MessagesPage, Person, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import type { AccountState } from "../account/useAccount";
import { color } from "../theme/tokens";
import { ConversationScreen } from "./ConversationScreen";
import { MessagesContext, type MessagesDoor } from "./messagesDoor";

// The small things of the chat (TASK-458): one's own bubbles in the app's
// yellow, the user's choice, with what they carry on a neutral plate; and a
// conversation with nothing in it yet, which offers three ways to begin.

const URL = "http://api";
const signedIn: AccountState = { status: "signedIn", session: session as Session };

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

/** The fake API of the conversation last opened: what was asked of it. */
let asked: jest.Mock = jest.fn();

/** The conversation on screen, the API answering `page` to every reading. */
async function open(page: MessagesPage) {
  const fetchFn = jest.fn(async (_input: string, init?: RequestInit) =>
    init?.method === "PUT" ? new Response(null, { status: 204 }) : Response.json(page),
  );
  asked = fetchFn;
  await render(
    <MessagesContext.Provider value={door()}>
      <ConversationScreen
        person={page.person as Person}
        onBack={jest.fn()}
        fetchFn={fetchFn as unknown as typeof fetch}
        apiKey={null}
      />
    </MessagesContext.Provider>,
  );
}

/** The colours of a bubble: its ground, and every line of text in it. */
function colours(bubble: ReturnType<typeof screen.getByLabelText>) {
  return {
    ground: StyleSheet.flatten(bubble.props.style).backgroundColor,
    texts: within(bubble)
      .getAllByText(/./)
      .map((text) => StyleSheet.flatten(text.props.style).color),
  };
}

test("one's own bubble is yellow with dark words, the other's stays neutral", async () => {
  const page = { ...(messagesExample as MessagesPage), next: null };
  const [theirs, mine] = page.messages;
  await open(page);
  await screen.findByText(mine.text);

  const own = colours(screen.getByLabelText(/^You: Hi! Is the heart/));
  expect(own.ground).toBe(color.accent);
  // A full face, not glass (ADR-0403, beside ADR-0383): the yellow itself,
  // opaque, with no veil, no relief and no shadow of its own, so it is the
  // same with «Reduce transparency» and «Increase contrast».
  expect(own.ground).toMatch(/^#[0-9A-F]{6}$/i);
  const face = StyleSheet.flatten(
    screen.getByLabelText(/^You: Hi! Is the heart/).props.style,
  );
  expect(face.opacity).toBeUndefined();
  expect(face.boxShadow).toBeUndefined();
  expect(face.borderColor).toBeUndefined();
  // The words and the time: both read on the yellow, in every tone.
  expect(own.texts.length).toBeGreaterThanOrEqual(1);
  expect(new Set(own.texts)).toEqual(new Set([color.onAccent]));

  const other = colours(screen.getByLabelText(/^Yes, but the bridge/));
  expect(other.ground).toBe(color.surface);
  expect(StyleSheet.flatten(screen.getByText(theirs.text).props.style).color).toBe(
    color.text,
  );
  expect(other.texts).not.toContain(color.onAccent);
});

test("what one's own message carries sits on a neutral plate, not on the yellow", async () => {
  // The other's message carries a post, one's own a post gone since.
  const page = { ...postExample, next: null } as unknown as MessagesPage;
  await open(page);
  const gone = await screen.findByTestId("message-post-gone");

  // One plate only: the other's card lies on its neutral bubble as before.
  const plates = screen.getAllByTestId("message-mine-media");
  expect(plates).toHaveLength(1);
  expect(StyleSheet.flatten(plates[0].props.style).backgroundColor).toBe(
    color.surfaceRaised,
  );
  expect(within(plates[0]).getByTestId("message-post-gone")).toBe(gone);
  expect(within(plates[0]).queryByTestId("message-post")).toBeNull();
  expect(screen.getByTestId("message-post")).toBeOnTheScreen();
});

const nothing = { ...(messagesExample as MessagesPage), messages: [], next: null };

test("a first conversation offers three ways to begin, and says the files come later", async () => {
  await open({ ...nothing, state: "first" });
  expect(await screen.findByTestId("conversation-empty")).toBeOnTheScreen();
  expect(screen.getByText("Say hi to Ada_runs.")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "I like your drawings" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Shall we run together?" }),
  ).toBeOnTheScreen();
  // A request is text only: no «+», and the line under the first one says why.
  expect(screen.queryByLabelText("Add a photo, a video or a drawing")).toBeNull();
  expect(
    screen.getByText("Photos, videos and drawings come after that."),
  ).toBeOnTheScreen();

  // A touch writes the words in the box, to change or to send: nothing leaves.
  await fireEvent.press(screen.getByRole("button", { name: "Hi Ada_runs!" }));
  expect(screen.getByLabelText("Message").props.value).toBe("Hi Ada_runs!");
  expect(asked.mock.calls.filter(([, init]) => init?.method === "POST")).toEqual([]);
});

test("an open conversation with nothing in it offers them too, with the «+»", async () => {
  await open({ ...nothing, state: "open" });
  expect(await screen.findByTestId("conversation-empty")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Hi Ada_runs!" })).toBeOnTheScreen();
  expect(screen.getByLabelText("Add a photo, a video or a drawing")).toBeOnTheScreen();
  expect(screen.queryByText("Photos, videos and drawings come after that.")).toBeNull();
});

test("a conversation with messages has no ways to begin", async () => {
  const page = { ...(messagesExample as MessagesPage), next: null };
  await open(page);
  await screen.findByText(page.messages[0].text);
  expect(screen.queryByTestId("conversation-empty")).toBeNull();
  expect(screen.queryByText("Say hi to Ada_runs.")).toBeNull();
});
