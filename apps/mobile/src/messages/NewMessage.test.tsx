import conversationsExample from "@shaperoute/shared-types/fixtures/conversations.json";
import peopleExample from "@shaperoute/shared-types/fixtures/people.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Person, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { AccountState } from "../account/useAccount";
import { MessagesPage } from "../tabs/MessagesPage";
import { MessagesContext, type MessagesDoor } from "./messagesDoor";
import { NewMessage } from "./NewMessage";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("react-native/Libraries/Modal/Modal", () => ({
  __esModule: true,
  default: jest.requireActual("./dismissingModal").default,
}));

// «New message» (TASK-458): from the list of the conversations, whom to
// write to; a touch opens the conversation, and nothing is sent from here.

const URL = "http://api";
const signedIn: AccountState = { status: "signedIn", session: session as Session };
const ada = conversationsExample.conversations[0].person as Person;
const adam = peopleExample.people.find((p) => p.username === "adam.trento") as Person;
const bea: Person = {
  public_id: "5d2c8e71-90ab-4c3d-8e4f-1a2b3c4d5e6f",
  username: "bea_hills",
  photo: null,
};

const INBOX = "GET /me/conversations?box=inbox&with=attachments";
const FOLLOWING = "GET /me/following";

function api(answers: Record<string, unknown>) {
  const asked: string[] = [];
  const fetchFn = jest.fn(async (input: string, init?: RequestInit) => {
    const call = `${init?.method ?? "GET"} ${input.replace(URL, "")}`;
    asked.push(call);
    if (!(call in answers)) {
      throw new Error(`Not in this test: ${call}`);
    }
    return Response.json(answers[call]);
  });
  return { fetchFn: fetchFn as unknown as typeof fetch, asked };
}

function door(over: Partial<MessagesDoor> = {}): MessagesDoor {
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
    ...over,
  };
}

const people = (list: Person[]) => ({ people: list, next: null, total: list.length });

test("who one writes to comes first, then who one follows, each once; a touch opens the conversation", async () => {
  const { fetchFn, asked } = api({
    [INBOX]: conversationsExample,
    [FOLLOWING]: people([bea, ada]),
  });
  const openConversation = jest.fn();
  const onClose = jest.fn();
  await render(
    <MessagesContext.Provider value={door({ openConversation })}>
      <NewMessage onClose={onClose} fetchFn={fetchFn} apiKey={null} />
    </MessagesContext.Provider>,
  );
  expect(screen.getByRole("header", { name: "New message" })).toBeOnTheScreen();
  await screen.findByText("bea_hills");
  expect(
    screen
      .getAllByRole("button", { name: /^Message / })
      .map((row) => row.props.accessibilityLabel),
  ).toEqual(["Message Ada_runs", "Message bea_hills"]);

  await fireEvent.press(screen.getByRole("button", { name: "Message bea_hills" }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(openConversation).toHaveBeenCalledWith(bea);
  // Read only: nothing was sent from this page.
  expect(asked.filter((call) => !call.startsWith("GET "))).toEqual([]);
});

test("a name typed looks among everyone, and says when nobody has it", async () => {
  const { fetchFn } = api({
    [INBOX]: { conversations: [], next: null, total: 0 },
    [FOLLOWING]: people([]),
    "GET /users?q=ada": { people: [adam] },
    "GET /users?q=zz": { people: [] },
  });
  const openConversation = jest.fn();
  await render(
    <MessagesContext.Provider value={door({ openConversation })}>
      <NewMessage onClose={jest.fn()} fetchFn={fetchFn} apiKey={null} />
    </MessagesContext.Provider>,
  );
  // Nobody written to, nobody followed: the page says what to do.
  expect(
    await screen.findByText("Search someone by name to write to them."),
  ).toBeOnTheScreen();

  await fireEvent.changeText(screen.getByLabelText("Search people"), "ada");
  await fireEvent.press(
    await screen.findByRole("button", { name: "Message adam.trento" }),
  );
  expect(openConversation).toHaveBeenCalledWith(adam);

  await fireEvent.changeText(screen.getByLabelText("Search people"), "zz");
  expect(await screen.findByText("Nobody has a name like that.")).toBeOnTheScreen();
});

test("«New message» is beside the title of «Messages», and «Close» takes its page away", async () => {
  const { fetchFn } = api({
    [INBOX]: conversationsExample,
    [FOLLOWING]: people([bea]),
  });
  await render(
    <MessagesContext.Provider value={door()}>
      <MessagesPage active fetchFn={fetchFn} apiKey={null} />
    </MessagesContext.Provider>,
  );
  expect(screen.queryByRole("header", { name: "New message" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "New message" }));
  expect(screen.getByRole("header", { name: "New message" })).toBeOnTheScreen();
  await screen.findByText("bea_hills");
  await fireEvent.press(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("header", { name: "New message" })).toBeNull();
});
