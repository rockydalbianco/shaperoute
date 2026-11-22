/**
 * «Feed» with the post of a night of sleep among the drawings (TASK-467
 * part E): with the sleep on the app says it reads one, shows it with its
 * own card and opens its own page; off, as in every build until part C,
 * it says what it said before.
 */
import page from "@shaperoute/shared-types/fixtures/feed.json";
import feedSleep from "@shaperoute/shared-types/fixtures/feed-sleep.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { AccountState } from "../account/useAccount";
import { DOUBLE_TAP_MS } from "../feed/useDoubleTap";
import { forgetFeed } from "../feed/useFeed";
import { sleepPostsOn } from "../health/sleepModules";
import { FollowsContext } from "../social/followsDoor";
import { FeedScreen } from "./FeedScreen";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});
jest.mock("../feed/feedTabChoice", () => ({
  loadFeedTab: jest.fn(() => "all"),
  saveFeedTab: jest.fn(),
}));
jest.mock("../health/sleepModules", () => ({
  ...jest.requireActual("../health/sleepModules"),
  sleepPostsOn: jest.fn(() => true),
}));

const on = jest.mocked(sleepPostsOn);
const API = "http://api";
const SIGNED_IN: AccountState = { status: "signedIn", session: session as Session };

let fetchSpy: jest.SpiedFunction<typeof fetch>;

function Around({ children }: { children: ReactNode }) {
  return (
    <FollowsContext.Provider
      value={{
        apiUrl: API,
        account: { state: SIGNED_IN, sessionEnded: () => {} },
        openProfile: () => {},
      }}
    >
      {children}
    </FollowsContext.Provider>
  );
}

/** What the app said it reads when it asked for the Feed. */
function saidToFeed(): string[] {
  const feedCall = fetchSpy.mock.calls.find(([url]) => String(url).includes("/feed"));
  const headers = feedCall?.[1]?.headers as Record<string, string>;
  return headers["X-MuW-Reads"].split(",");
}

beforeEach(() => {
  forgetFeed();
  on.mockReturnValue(true);
  fetchSpy = jest.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    if (url.startsWith(`${API}/feed`)) {
      // As the API: the post of a night only to an app that says `sleep`.
      const reads = (headers["X-MuW-Reads"] ?? "").split(",");
      return Response.json({
        ...page,
        posts: [...(reads.includes("sleep") ? feedSleep.posts : []), page.posts[0]],
        filter: "all",
      });
    }
    return Response.json(
      { error: { code: "http_error", message: url } },
      { status: 404 },
    );
  });
});

afterEach(() => {
  fetchSpy.mockRestore();
  jest.useRealTimers();
});

test("on: the post of a night has its card beside the drawings, and its page", async () => {
  await render(
    <Around>
      <FeedScreen onOpen={() => {}} />
    </Around>,
  );
  expect(await screen.findByTestId("sleep-feed-post")).toBeOnTheScreen();
  expect(saidToFeed()).toContain("sleep");
  expect(screen.getByText("Sunday heart by the river")).toBeOnTheScreen();
  expect(screen.getAllByTestId("sleep-feed-post")).toHaveLength(1);
  expect(screen.getByText("82 · Very good")).toBeOnTheScreen();
  jest.useFakeTimers();
  await fireEvent.press(
    within(screen.getByTestId("sleep-feed-post")).getByTestId("feed-post"),
  );
  await act(async () => {
    jest.advanceTimersByTime(DOUBLE_TAP_MS + 1);
  });
  jest.useRealTimers();
  expect(await screen.findByTestId("sleep-post-detail")).toBeOnTheScreen();
  expect(screen.queryByTestId("post-page")).toBeNull();
  expect(screen.queryByTestId("photo-post-page")).toBeNull();
});

test("off: the app does not say `sleep`, and the Feed is the one of before", async () => {
  on.mockReturnValue(false);
  await render(
    <Around>
      <FeedScreen onOpen={() => {}} />
    </Around>,
  );
  expect(await screen.findByText("Sunday heart by the river")).toBeOnTheScreen();
  expect(saidToFeed()).not.toContain("sleep");
  expect(screen.queryByTestId("sleep-feed-post")).toBeNull();
  expect(screen.queryByText("Sleep score")).toBeNull();
});
