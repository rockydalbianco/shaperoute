/**
 * «Feed» and the gym plans posted (TASK-485 part B2, ADR-0394): a plan
 * post left on the phone (no network at «Post») goes up from the Feed,
 * the page always built, without opening «Workout plan» again; once it
 * reaches the API the page reads again.
 */
import page from "@shaperoute/shared-types/fixtures/feed.json";
import myPlanPost from "@shaperoute/shared-types/fixtures/my-plan-post.json";
import request from "@shaperoute/shared-types/fixtures/plan-post-request.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { PlanPostRequest, Session } from "@shaperoute/shared-types";
import { render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { AccountState } from "../account/useAccount";
import { keepPlanPost, loadPlanPosts } from "../api/planPosts";
import { forgetFeed } from "../feed/useFeed";
import { gymKey } from "../gym/gymKey";
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
const OWNER = (session as Session).user.id;
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
  fetchSpy = jest.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.startsWith(`${API}/feed`)) {
      return Response.json({ ...page, filter: "all" });
    }
    if (url.startsWith(`${API}/me/plan-posts/`) && init?.method === "PUT") {
      return Response.json(myPlanPost);
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

function feedCalls(): number {
  return fetchSpy.mock.calls.filter(([url]) => String(url).startsWith(`${API}/feed`))
    .length;
}

test("a plan post left on the phone goes up from the Feed, which reads again", async () => {
  const key = gymKey(Date.now());
  expect(keepPlanPost(OWNER, key, request as PlanPostRequest)).toBe("kept");
  await render(
    <Around>
      <FeedScreen onOpen={() => {}} />
    </Around>,
  );
  await waitFor(() =>
    expect(
      fetchSpy.mock.calls.some(
        ([url, init]) =>
          String(url) === `${API}/me/plan-posts/${key}` && init?.method === "PUT",
      ),
    ).toBe(true),
  );
  await waitFor(() => expect(feedCalls()).toBeGreaterThanOrEqual(2));
  const mine = loadPlanPosts().find((one) => one.key === key);
  expect(mine?.state).toBe("sent");
  expect(screen.getByTestId("feed-add")).toBeOnTheScreen();
});

test("with nothing waiting the Feed sends no plan post", async () => {
  await render(
    <Around>
      <FeedScreen onOpen={() => {}} />
    </Around>,
  );
  await screen.findByTestId("feed-add");
  await new Promise((resolve) => setTimeout(resolve, 200));
  // One reading, and no second one: nothing went up.
  expect(feedCalls()).toBe(1);
  expect(
    fetchSpy.mock.calls.some(([url]) => String(url).includes("/me/plan-posts/")),
  ).toBe(false);
});
