/**
 * The routes MuW drew in «Feed» (TASK-365, ADR-0310): while the API has
 * them, one row in 6 of «All» at most, the first after the 3rd drawing, also
 * among the examples without an account, never in «Following»; a tap opens
 * the route. From an API without them, the Feed is as before. They are off
 * since TASK-430 (FeedScreenNoMuw.test.tsx): here they are switched on, as
 * they would be again.
 */
import page from "@shaperoute/shared-types/fixtures/feed.json";
import list from "@shaperoute/shared-types/fixtures/muw-routes.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { FeedPost, MuwRoute, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactElement, ReactNode } from "react";

import type { AccountState } from "../account/useAccount";
import { saveFeedTab } from "../feed/feedTabChoice";
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
jest.mock("../feed/muwInFeed", () => ({ MUW_ROUTES_IN_FEED: true }));
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
const [MUSHROOM] = list.routes as unknown as MuwRoute[];
// Three, for the three places of the examples.
const ROUTES: MuwRoute[] = ["a", "b", "c"].map((id) => ({ ...MUSHROOM, id }));
// Ten drawings: room for a route after the 3rd and after the 8th.
const DRAWINGS: FeedPost[] = Array.from({ length: 10 }, (_, i) => ({
  ...STAR,
  id: `d${i}`,
}));

let fetchSpy: jest.SpiedFunction<typeof fetch>;
let withRoutes: boolean;

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
  withRoutes = true;
  fetchSpy = jest.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("filter=following")) {
      return Response.json({
        posts: DRAWINGS,
        next: null,
        filter: "following",
        follows_anyone: true,
      });
    }
    if (url.startsWith(`${API}/feed`)) {
      return Response.json({ posts: DRAWINGS, next: null, filter: "all" });
    }
    if (url === `${API}/muw-routes` && withRoutes) {
      return Response.json({ ...list, routes: ROUTES });
    }
    return Response.json(
      { error: { code: "http_error", message: url } },
      { status: 404 },
    );
  });
});

afterEach(() => fetchSpy.mockRestore());

/** The kinds of the rows of a list, as it has them now. */
function kinds(testID: string): string[] {
  return (screen.getByTestId(testID).props.data as { kind: string }[]).map(
    (row) => row.kind,
  );
}

test("in «All», after the 3rd drawing and after the 8th, in their order", async () => {
  await render(
    <Around>
      <FeedScreen onOpen={() => {}} />
    </Around>,
  );
  await waitFor(() => expect(kinds("feed-list")).toContain("muw"));
  const rows = kinds("feed-list");
  expect(rows.indexOf("muw")).toBe(3);
  expect(rows.lastIndexOf("muw")).toBe(9);
  expect(rows.filter((kind) => kind === "muw")).toHaveLength(2);
  const shown = (
    screen.getByTestId("feed-list").props.data as { kind: string; route?: MuwRoute }[]
  )
    .filter((row) => row.kind === "muw")
    .map((row) => row.route?.id);
  expect(shown).toEqual(ROUTES.slice(0, 2).map((route) => route.id));
});

test("never in «Following»", async () => {
  await render(
    <Around>
      <FeedScreen onOpen={() => {}} />
    </Around>,
  );
  await waitFor(() => expect(kinds("feed-list")).toContain("muw"));
  await fireEvent.press(screen.getByText("Following"));
  await waitFor(() => expect(kinds("feed-list-following")).toHaveLength(10));
  expect(kinds("feed-list-following").every((kind) => kind === "post")).toBe(true);
});

test("without an account, among the examples", async () => {
  await render(
    <Around state={SIGNED_OUT}>
      <FeedScreen onOpen={() => {}} />
    </Around>,
  );
  await waitFor(() => expect(kinds("feed-list")).toContain("muw"));
  const rows = kinds("feed-list");
  expect(rows.filter((kind) => kind === "post")).toHaveLength(SAMPLE_FEED.length);
  // 15 examples: after the 3rd, the 8th and the 13th.
  expect(rows.filter((kind) => kind === "muw")).toHaveLength(3);
  expect(rows.indexOf("muw")).toBe(3);
});

test("a tap opens the route", async () => {
  const onOpenMuw = jest.fn();
  await render(
    <Around>
      <FeedScreen onOpen={() => {}} onOpenMuw={onOpenMuw} />
    </Around>,
  );
  await waitFor(() => expect(kinds("feed-list")).toContain("muw"));
  // The list draws two rows at first: the route's row as the list draws it.
  const feedList = screen.getByTestId("feed-list");
  const data = feedList.props.data as { kind: string }[];
  const index = data.findIndex((row) => row.kind === "muw");
  const { renderItem } = feedList.props as {
    renderItem: (info: { item: unknown; index: number }) => ReactElement;
  };
  await render(<Around>{renderItem({ item: data[index], index })}</Around>);
  await fireEvent.press(screen.getByTestId("muw-post"));
  expect(onOpenMuw).toHaveBeenCalledWith(ROUTES[0]);
});

test("from an API without them, the Feed is as before", async () => {
  withRoutes = false;
  await render(
    <Around>
      <FeedScreen onOpen={() => {}} />
    </Around>,
  );
  await waitFor(() => expect(kinds("feed-list")).toHaveLength(10));
  await waitFor(() =>
    expect(
      fetchSpy.mock.calls.some(([url]) => String(url) === `${API}/muw-routes`),
    ).toBe(true),
  );
  expect(kinds("feed-list").every((kind) => kind === "post")).toBe(true);
  expect(screen.queryByTestId("muw-post")).toBeNull();
});
