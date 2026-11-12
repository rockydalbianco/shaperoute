import postExample from "@shaperoute/shared-types/fixtures/message-post.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type {
  Message,
  MessageAttachment,
  MessagesPage,
  Person,
  Session,
} from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { AccountState } from "../account/useAccount";
import { DrawingsContext, type DrawingsDoor } from "../social/drawingsDoor";
import { attachmentLabel, attachmentLine, messageLine } from "./attachmentText";
import { ConversationScreen } from "./ConversationScreen";
import { MessageMedia } from "./MessageMedia";
import { MessagesContext, type MessagesDoor } from "./messagesDoor";
import { PostCard } from "./PostCard";

jest.mock("react-native/Libraries/Modal/Modal", () => ({
  __esModule: true,
  default: jest.requireActual("./dismissingModal").default,
}));

// A post in a conversation (TASK-455, ADR-0382): its card as the API
// answered it for who reads, a tap opens the post as a notification does;
// a post who reads may not open, or gone, says so and opens nothing.

const URL = "http://api";
const signedIn: AccountState = { status: "signedIn", session: session as Session };
// The example reaches only an app that says it reads posts: read as such.
const page = { ...postExample, next: null } as unknown as MessagesPage;
const ada = page.person as Person;
const [shown, gone] = page.messages as [Message, Message];
const card = (shown.attachment as MessageAttachment).post!;

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

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

test("the card shows the line's name, who published it and how long it is", async () => {
  await render(<PostCard post={card} />);
  expect(screen.getByTestId("message-post")).toBeOnTheScreen();
  expect(screen.getByText("Sunday star")).toBeOnTheScreen();
  expect(screen.getByText("by cleo_draws · 4.0 km")).toBeOnTheScreen();
});

test("a post who reads may not open says so, and shows nothing of it", async () => {
  await render(<PostCard post={null} />);
  expect(screen.getByText("This post is no longer available.")).toBeOnTheScreen();
  expect(screen.queryByTestId("message-post")).toBeNull();
});

test("the bubble of a message draws the card of its post", async () => {
  await render(
    <MessageMedia
      attachment={shown.attachment as MessageAttachment}
      apiUrl={URL}
      token="t"
    />,
  );
  expect(screen.getByText("Sunday star")).toBeOnTheScreen();
});

test("the list and the screen reader say it is a post", () => {
  expect(attachmentLine("post")).toBe("🗺️ Post");
  // With words, its sign before them; alone, what it is.
  expect(messageLine(shown)).toBe("🗺️ Shall we run this one on Sunday?");
  expect(messageLine(gone)).toBe("🗺️ Post");
  expect(attachmentLabel(shown.attachment as MessageAttachment)).toBe(
    "Sunday star, by cleo_draws · 4.0 km",
  );
  expect(attachmentLabel(gone.attachment as MessageAttachment)).toBe(
    "This post is no longer available.",
  );
});

test("a post touched opens as a notification opens one, and the conversation closes", async () => {
  const asked: { url: string; reads: string | undefined }[] = [];
  const fetchFn = jest.fn(async (input: string, init?: RequestInit) => {
    const url = input.replace(URL, "");
    const headers = init?.headers as Record<string, string> | undefined;
    asked.push({ url, reads: headers?.["X-MuW-Reads"] });
    return url.endsWith("/read")
      ? new Response(null, { status: 204 })
      : Response.json(page);
  }) as unknown as typeof fetch;
  const open = jest.fn();
  const drawings = { open } as unknown as DrawingsDoor;
  const messages = door();
  await render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <DrawingsContext.Provider value={drawings}>
        <MessagesContext.Provider value={messages}>
          <ConversationScreen
            person={ada}
            onBack={jest.fn()}
            fetchFn={fetchFn}
            apiKey={null}
            everyMs={3_600_000}
          />
        </MessagesContext.Provider>
      </DrawingsContext.Provider>
    </SafeAreaProvider>,
  );
  await screen.findByText("Sunday star");
  // The page was asked by an app that says it reads a post.
  const pageAsked = asked.find((call) => call.url.includes("/messages?"));
  expect(pageAsked?.reads?.split(",")).toContain("post");
  // The post that is gone is words, not a button.
  expect(screen.getByText("This post is no longer available.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByText("Sunday star"));
  await waitFor(() => expect(open).toHaveBeenCalledWith({ id: card.id }));
  expect(messages.close).toHaveBeenCalled();
  expect(open).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByText("This post is no longer available."));
  expect(open).toHaveBeenCalledTimes(1);
});
