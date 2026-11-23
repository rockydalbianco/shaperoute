import page from "@shaperoute/shared-types/fixtures/feed.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { FeedPost, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { ScrollView } from "react-native";

import { forgetFeed } from "../feed/useFeed";
import { FeedScreen } from "../screens/FeedScreen";
import { FollowsContext } from "../social/followsDoor";
import { HeaderScrollContext, useHeaderScroll } from "./headerScroll";

// «Feed» tells the header its scroll too (TASK-469 A5c-2, ADR-0383): each
// tab keeps its own list, and only the one on the screen speaks. A tab
// hidden while away from its top leaves the header at rest; shown again,
// it says where it is.

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
// The tab chosen, kept in memory instead of a file.
jest.mock("../feed/feedTabChoice", () => {
  let kept = "all";
  return {
    loadFeedTab: jest.fn(() => kept),
    saveFeedTab: jest.fn((tab: string) => {
      kept = tab;
    }),
  };
});

const API = "http://api";
const [FIRST] = page.posts as FeedPost[];
const POSTS: FeedPost[] = Array.from({ length: 6 }, (_, index) => ({
  ...FIRST,
  id: `post-${index}`,
  title: `Drawing ${index}`,
  rotation_deg: 0,
}));

let fetchSpy: jest.SpiedFunction<typeof fetch>;

beforeEach(() => {
  forgetFeed();
  fetchSpy = jest.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.startsWith(`${API}/feed`)) {
      return Response.json({ posts: POSTS, next: null, filter: "all" });
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

function scrollTo(y: number) {
  return { nativeEvent: { contentOffset: { x: 0, y } } };
}

async function showFeed(report: jest.Mock) {
  await render(
    <HeaderScrollContext.Provider value={report}>
      <FollowsContext.Provider
        value={{
          apiUrl: API,
          account: {
            state: { status: "signedIn", session: session as Session },
            sessionEnded: () => {},
          },
          openProfile: () => {},
        }}
      >
        <FeedScreen onOpen={() => {}} />
      </FollowsContext.Provider>
    </HeaderScrollContext.Provider>,
  );
  await screen.findAllByText("Drawing 0");
}

/** The list of «All». */
function all() {
  return screen.getByTestId("feed-list", { includeHiddenElements: true });
}

/** What the header was told last. */
function last(report: jest.Mock): boolean | undefined {
  return report.mock.calls.at(-1)?.[0] as boolean | undefined;
}

test("«All» tells the header when it leaves the top and when it is back", async () => {
  const report = jest.fn();
  await showFeed(report);
  expect(report).not.toHaveBeenCalled();
  await fireEvent.scroll(all(), scrollTo(300));
  expect(report).toHaveBeenLastCalledWith(true);
  await fireEvent.scroll(all(), scrollTo(0));
  expect(report).toHaveBeenLastCalledWith(false);
});

/** Two tabs that keep their lists, as «All» and «Following» of the Feed. */
function Tabs({ shown }: { shown: "all" | "following" }) {
  return (
    <>
      <List id="all" active={shown === "all"} />
      <List id="following" active={shown === "following"} />
    </>
  );
}
function List({ id, active }: { id: string; active: boolean }) {
  return <ScrollView testID={id} {...useHeaderScroll(active)} />;
}

async function showTabs(report: jest.Mock, shown: "all" | "following") {
  return render(told(<Tabs shown={shown} />, report));
}
function told(children: ReactNode, report: jest.Mock) {
  return (
    <HeaderScrollContext.Provider value={report}>
      {children}
    </HeaderScrollContext.Provider>
  );
}
function list(id: string) {
  return screen.getByTestId(id);
}

test("another tab at its top: the header goes to rest; back, it is glass again", async () => {
  const report = jest.fn();
  const { rerender } = await showTabs(report, "all");
  await fireEvent.scroll(list("all"), scrollTo(300));
  expect(last(report)).toBe(true);

  await rerender(told(<Tabs shown="following" />, report));
  expect(last(report)).toBe(false);

  await rerender(told(<Tabs shown="all" />, report));
  expect(last(report)).toBe(true);
});

test.each([
  ["all", "following"],
  ["following", "all"],
] as const)(
  "from %s scrolled to %s scrolled, the header stays glass",
  async (from, to) => {
    const report = jest.fn();
    const { rerender } = await showTabs(report, to);
    await fireEvent.scroll(list(to), scrollTo(500));
    await rerender(told(<Tabs shown={from} />, report));
    await fireEvent.scroll(list(from), scrollTo(300));
    expect(last(report)).toBe(true);

    // The hidden one goes to rest first, then the one shown says it is away.
    await rerender(told(<Tabs shown={to} />, report));
    expect(last(report)).toBe(true);
  },
);

test("a hidden tab that scrolls tells nobody", async () => {
  const report = jest.fn();
  await showTabs(report, "all");
  await fireEvent.scroll(list("following"), scrollTo(400));
  expect(report).not.toHaveBeenCalled();
});
