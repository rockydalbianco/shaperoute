import messagesExample from "@shaperoute/shared-types/fixtures/messages.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type {
  Message,
  MessageNews,
  MessagesPage,
  Person,
  Session,
} from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Profiler } from "react";
import { AppState, type AppStateStatus } from "react-native";

import type { AccountState } from "../account/useAccount";
import { ConversationScreen } from "./ConversationScreen";
import { MessagesContext, type MessagesDoor } from "./messagesDoor";

// How an open conversation asks again (TASK-498), on the clock of the
// tests: after the first page only what is new, from the place of the last
// answer; the page once a minute; slower in silence and fast again when
// somebody writes; nothing drawn again for an answer that changes nothing;
// the page every time with a server of before.

const API = "http://api";
const signedIn: AccountState = { status: "signedIn", session: session as Session };
const first = { ...(messagesExample as MessagesPage), next: null };
const ada = first.person as Person;
const PAGE = `${API}/conversations/${ada.public_id}/messages?with=attachments`;

function message(n: number, mine = false): Message {
  const id = `e3b1c0d2-0000-4000-8000-${String(n).padStart(12, "0")}`;
  return {
    id,
    text: `Message ${n}`,
    created_at: `2026-10-26T10:00:${String(n).padStart(2, "0")}Z`,
    mine,
    attachment: null,
  };
}

/** The place the API would say for a message of the tests. */
function placeOf(m: Message): string {
  return `${Date.parse(m.created_at) * 1000}-${m.id.replaceAll("-", "")}`;
}

/** The API of the tests: the page, and what came after a place. */
function api(start: MessagesPage = first) {
  const server = {
    page: start,
    /** What the next `?after=` answers, once; then nothing new. */
    news: null as MessageNews | null,
    /** "P" for each page asked, "N" for each `?after=`. */
    asked: "",
    places: [] as string[],
    reads: 0,
    arrives(m: Message) {
      server.page = {
        ...server.page,
        messages: [m, ...server.page.messages],
        latest: placeOf(m),
      };
      server.news = {
        state: server.page.state,
        messages: [m],
        more: false,
        latest: placeOf(m),
      };
    },
  };
  const fetchFn = jest.fn(async (input: string, init?: RequestInit) => {
    if (init?.method === "PUT") {
      server.reads += 1;
      return new Response(null, { status: 204 });
    }
    if (init?.method === "POST") {
      const sent = { ...message(50, true), text: JSON.parse(String(init.body)).text };
      server.page = { ...server.page, messages: [sent, ...server.page.messages] };
      return Response.json(sent, { status: 201 });
    }
    if (input === PAGE) {
      server.asked += "P";
      return Response.json(server.page);
    }
    expect(input.startsWith(`${PAGE}&after=`)).toBe(true);
    const after = decodeURIComponent(input.slice(`${PAGE}&after=`.length));
    server.asked += "N";
    server.places.push(after);
    const answer: MessageNews = server.news ?? {
      state: server.page.state,
      messages: [],
      more: false,
      latest: after,
    };
    server.news = null;
    return Response.json(answer);
  });
  return { server, fetchFn: fetchFn as unknown as typeof fetch };
}

const door: MessagesDoor = {
  apiUrl: API,
  account: { state: signedIn, sessionEnded: jest.fn() },
  screen: null,
  openList: jest.fn(),
  openConversation: jest.fn(),
  back: jest.fn(),
  close: jest.fn(),
  unread: { unread: 0, requests: 0 },
  recount: jest.fn(),
};

async function open(fetchFn: typeof fetch, drawn: jest.Mock = jest.fn()) {
  await render(
    <MessagesContext.Provider value={door}>
      <Profiler id="conversation" onRender={drawn}>
        <ConversationScreen
          person={ada}
          onBack={jest.fn()}
          fetchFn={fetchFn}
          apiKey={null}
        />
      </Profiler>
    </MessagesContext.Provider>,
  );
  await act(async () => {});
}

/** The clock moves on, a question's time at once: each answer comes. */
async function pass(seconds: number) {
  for (let done = 0; done < seconds; done += 5) {
    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });
  }
}

let listeners: ((next: AppStateStatus) => void)[] = [];
async function goTo(next: AppStateStatus) {
  await act(async () => {
    listeners.forEach((listener) => listener(next));
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  listeners = [];
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
    listeners.push(listener as (next: AppStateStatus) => void);
    return {
      remove: () => {
        listeners = listeners.filter((other) => other !== listener);
      },
    } as ReturnType<typeof AppState.addEventListener>;
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("after the first page only what is new is asked, from the last place", async () => {
  const { server, fetchFn } = api();
  await open(fetchFn);
  expect(server.asked).toBe("P");
  await pass(5);
  expect(server.asked).toBe("PN");
  expect(server.places).toEqual([first.latest]);
  // A message of the other comes: on the screen, and read.
  const newer = message(1);
  server.arrives(newer);
  await pass(5);
  expect(screen.getByText("Message 1")).toBeOnTheScreen();
  expect(screen.getByText(first.messages[0].text)).toBeOnTheScreen();
  expect(server.reads).toBe(2);
  // The next question starts from it.
  await pass(5);
  expect(server.asked).toBe("PNNN");
  expect(server.places).toEqual([first.latest, first.latest, placeOf(newer)]);
});

test("in silence the questions slow down, and the page comes each minute", async () => {
  const { server, fetchFn } = api();
  await open(fetchFn);
  // The first minute: every 5 s, the page again at its end.
  await pass(60);
  expect(server.asked).toBe("P" + "N".repeat(11) + "P");
  // From one minute to five: every 15 s.
  await pass(240);
  expect(server.asked).toBe("P" + "N".repeat(11) + "P" + "NNNP".repeat(4));
  // After five minutes: every 30 s.
  server.asked = "";
  await pass(120);
  expect(server.asked).toBe("NPNP");
});

test("a message that comes brings the fast rhythm back", async () => {
  const { server, fetchFn } = api();
  await open(fetchFn);
  await pass(120);
  server.asked = "";
  server.arrives(message(1));
  // The slow question that finds it, 15 s later…
  await pass(15);
  expect(server.asked).toBe("N");
  expect(screen.getByText("Message 1")).toBeOnTheScreen();
  // …then every 5 s again, for a minute.
  await pass(10);
  expect(server.asked).toBe("NNN");
});

test("sending a message brings it back too", async () => {
  const { server, fetchFn } = api();
  await open(fetchFn);
  await pass(120);
  server.asked = "";
  await fireEvent.changeText(screen.getByLabelText("Message"), "On my way");
  await fireEvent.press(screen.getByRole("button", { name: "Send" }));
  await act(async () => {});
  expect(screen.getByText("On my way")).toBeOnTheScreen();
  await pass(10);
  expect(server.asked).toHaveLength(2);
  expect(screen.getByText("On my way")).toBeOnTheScreen();
});

test("behind, nothing is asked; back in the app, the page at once and fast", async () => {
  const { server, fetchFn } = api();
  await open(fetchFn);
  await pass(120);
  server.asked = "";
  await goTo("background");
  await pass(60);
  expect(server.asked).toBe("");
  await goTo("active");
  expect(server.asked).toBe("P");
  await pass(10);
  expect(server.asked).toBe("PNN");
});

test("an answer that changes nothing draws nothing again", async () => {
  const { server, fetchFn } = api();
  const drawn = jest.fn();
  await open(fetchFn, drawn);
  expect(screen.getByText(first.messages[0].text)).toBeOnTheScreen();
  drawn.mockClear();
  // Eleven times nothing new, then the same page again.
  await pass(60);
  expect(server.asked).toBe("P" + "N".repeat(11) + "P");
  expect(drawn).not.toHaveBeenCalled();
  // A message draws it.
  server.arrives(message(1));
  await pass(15);
  expect(screen.getByText("Message 1")).toBeOnTheScreen();
  expect(drawn).toHaveBeenCalled();
});

test("a state that changes, or more news than fit, asks the page at once", async () => {
  const waiting: MessagesPage = { ...first, state: "waiting", attachments: null };
  const { server, fetchFn } = api(waiting);
  await open(fetchFn);
  expect(screen.queryByLabelText("Message")).toBeNull();
  // The other accepted: the news say so, the page says the rest.
  server.page = { ...first };
  server.news = { state: "open", messages: [], more: false, latest: first.latest! };
  await pass(5);
  expect(server.asked).toBe("PNP");
  expect(screen.getByLabelText("Message")).toBeOnTheScreen();
  // More news than an answer holds: the page, and its messages.
  const many = [message(3), message(2), message(1)];
  server.page = { ...first, messages: [...many, ...first.messages] };
  server.news = {
    state: "open",
    messages: many.slice(0, 2),
    more: true,
    latest: placeOf(many[0]),
  };
  await pass(5);
  expect(server.asked).toBe("PNPNP");
  expect(screen.getByText("Message 1")).toBeOnTheScreen();
  expect(screen.getByText("Message 3")).toBeOnTheScreen();
});

test("a server of before: the page every time, at the same rhythm", async () => {
  const before = { ...first };
  delete before.latest;
  const { server, fetchFn } = api(before);
  await open(fetchFn);
  await pass(60);
  expect(server.asked).toBe("P".repeat(13));
  await pass(60);
  expect(server.asked).toBe("P".repeat(17));
  // A message on the page brings the fast rhythm back.
  server.page = { ...before, messages: [message(1), ...before.messages] };
  await pass(15);
  expect(screen.getByText("Message 1")).toBeOnTheScreen();
  server.asked = "";
  await pass(10);
  expect(server.asked).toBe("PP");
});

test("a page answered to the question for the news is read as a page", async () => {
  // The server went back to a version of before: it ignores `after`.
  const { server, fetchFn } = api();
  await open(fetchFn);
  const before = { ...first, messages: [message(1), ...first.messages] };
  delete before.latest;
  (fetchFn as unknown as jest.Mock).mockImplementation(async () =>
    Response.json(before),
  );
  await pass(5);
  expect(screen.getByText("Message 1")).toBeOnTheScreen();
  expect(server.asked).toBe("P");
});
