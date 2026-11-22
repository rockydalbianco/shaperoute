/**
 * «Feed» with a post of photos only among the drawings (TASK-312 part C2):
 * one post the app could not read would take the whole page with it, so
 * the page shows both, each with its own card, and a tap on the post of
 * photos opens its own page.
 */
import page from "@shaperoute/shared-types/fixtures/feed.json";
import feedPhotos from "@shaperoute/shared-types/fixtures/feed-photos.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { AccountState } from "../account/useAccount";
import { forgetFeed } from "../feed/useFeed";
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

beforeEach(() => {
  forgetFeed();
  fetchSpy = jest.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.startsWith(`${API}/feed`)) {
      return Response.json({
        ...page,
        posts: [...feedPhotos.posts, page.posts[0]],
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
});

test("the post of photos only has its card beside the drawings, and its page", async () => {
  await render(
    <Around>
      <FeedScreen onOpen={() => {}} />
    </Around>,
  );
  expect(await screen.findByTestId("photo-feed-post")).toBeOnTheScreen();
  expect(screen.getByText("Sunday heart by the river")).toBeOnTheScreen();
  expect(screen.getAllByTestId("photo-feed-post")).toHaveLength(1);
  await fireEvent.press(screen.getByText("Lake morning"));
  expect(await screen.findByTestId("photo-post-page")).toBeOnTheScreen();
  expect(screen.queryByTestId("post-page")).toBeNull();
});

test("the app says it reads posts of photos only", async () => {
  await render(
    <Around>
      <FeedScreen onOpen={() => {}} />
    </Around>,
  );
  await screen.findByTestId("photo-feed-post");
  const feedCall = fetchSpy.mock.calls.find(([url]) => String(url).includes("/feed"));
  const headers = feedCall?.[1]?.headers as Record<string, string>;
  expect(headers["X-MuW-Reads"].split(",")).toContain("photos");
});
