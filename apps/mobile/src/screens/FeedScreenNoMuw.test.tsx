/**
 * No route MuW drew in «Feed» (TASK-430, ADR-0358, the user's choice of
 * 2026-11-10): even from an API that has them, «All» shows only the posts,
 * with an account and without, and the app does not ask for them.
 */
import page from "@shaperoute/shared-types/fixtures/feed.json";
import list from "@shaperoute/shared-types/fixtures/muw-routes.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { FeedPost, Session } from "@shaperoute/shared-types";
import { render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { AccountState } from "../account/useAccount";
import { saveFeedTab } from "../feed/feedTabChoice";
import { MUW_ROUTES_IN_FEED } from "../feed/muwInFeed";
import { forgetFeed } from "../feed/useFeed";
import { forgetMuwRoutes } from "../feed/useMuwRoutes";
import { forgetStylePosts } from "../feed/useStylePosts";
import { SAMPLE_FEED } from "../feed/sampleFeed";
import { FollowsContext } from "../social/followsDoor";
import { PeopleContext } from "../social/peopleDoor";
import { FeedScreen } from "./FeedScreen";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("../feed/feedTabChoice", () => {
  let kept = "all";
  return {
    loadFeedTab: jest.fn(() => kept),
    saveFeedTab: jest.fn((tab: string) => {
      kept = tab;
    }),
  };
});
jest.mock("expo-file-system", () => {
  class MockFile {
    get exists() {
      return false;
    }
    create() {}
    write() {}
    textSync() {
      return "";
    }
  }
  return { File: MockFile, Paths: { document: "doc" } };
});

const API = "http://api";
const SIGNED_IN: AccountState = { status: "signedIn", session: session as Session };
const SIGNED_OUT: AccountState = { status: "signedOut", notice: null };
const [STAR] = page.posts as FeedPost[];
const DRAWINGS: FeedPost[] = Array.from({ length: 10 }, (_, i) => ({
  ...STAR,
  id: `d${i}`,
}));

let fetchSpy: jest.SpiedFunction<typeof fetch>;

function Around({
  children,
  state = SIGNED_IN,
}: {
  children: ReactNode;
  state?: AccountState;
}) {
  return (
    <FollowsContext.Provider
      value={{
        apiUrl: API,
        account: { state, sessionEnded: () => {} },
        openProfile: () => {},
      }}
    >
      <PeopleContext.Provider value={{ open: () => {} }}>
        {children}
      </PeopleContext.Provider>
    </FollowsContext.Provider>
  );
}

beforeEach(() => {
  forgetFeed();
  forgetMuwRoutes();
  forgetStylePosts();
  saveFeedTab("all");
  fetchSpy = jest.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.startsWith(`${API}/feed`)) {
      return Response.json({ posts: DRAWINGS, next: null, filter: "all" });
    }
    if (url === `${API}/muw-routes`) {
      return Response.json(list);
    }
    return Response.json(
      { error: { code: "http_error", message: url } },
      { status: 404 },
    );
  });
});

afterEach(() => fetchSpy.mockRestore());

function kinds(): string[] {
  return (screen.getByTestId("feed-list").props.data as { kind: string }[]).map(
    (row) => row.kind,
  );
}

function askedForMuw(): boolean {
  return fetchSpy.mock.calls.some(([url]) =>
    String(url).startsWith(`${API}/muw-routes`),
  );
}

test("they are off", () => {
  expect(MUW_ROUTES_IN_FEED).toBe(false);
});

test("with an account, «All» has only the posts and never asks for them", async () => {
  await render(
    <Around>
      <FeedScreen onOpen={() => {}} />
    </Around>,
  );
  await waitFor(() => expect(kinds()).toHaveLength(DRAWINGS.length));
  expect(kinds().every((kind) => kind === "post")).toBe(true);
  expect(screen.queryByTestId("muw-post")).toBeNull();
  expect(askedForMuw()).toBe(false);
});

test("without an account, only the examples", async () => {
  await render(
    <Around state={SIGNED_OUT}>
      <FeedScreen onOpen={() => {}} />
    </Around>,
  );
  await waitFor(() =>
    expect(kinds().filter((kind) => kind === "post")).toHaveLength(SAMPLE_FEED.length),
  );
  expect(kinds()).not.toContain("muw");
  expect(askedForMuw()).toBe(false);
});
