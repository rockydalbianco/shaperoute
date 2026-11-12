import feed from "@shaperoute/shared-types/fixtures/feed.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import summary from "@shaperoute/shared-types/fixtures/sleep-summary.json";
import type { FeedPost as Post, Session } from "@shaperoute/shared-types";
import { act, render, screen } from "@testing-library/react-native";

import type { AccountState } from "../account/useAccount";
import { sleepPostsOn } from "../health/sleepModules";
import { forgetSleepNow } from "../health/sleepNow";
import { FollowsContext } from "../social/followsDoor";
import { ReactionsContext, type ReactionsDoor } from "../social/reactionsDoor";
import { FeedPost } from "./FeedPost";
import { shownPost } from "./feedPosts";
import { PostPage } from "./PostPage";

// The night of a post in «Feed» and on the page of the post (TASK-467 part
// B2): read from `sleep` of the post as its list gave it (part B1b), with
// no request of its own. Off in every build until part C, when a night the
// API gives is not shown.

jest.mock("expo-file-system");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("../health/sleepModules", () => ({
  ...jest.requireActual("../health/sleepModules"),
  sleepPostsOn: jest.fn(() => true),
}));

const on = jest.mocked(sleepPostsOn);
const fetchSpy = jest.spyOn(globalThis, "fetch");
const signedIn: AccountState = { status: "signedIn", session: session as Session };
const OTHERS = {
  ...(feed.posts[0] as Post),
  author: {
    public_id: "3b9d2e10-7c4a-4f8e-a1d6-5e2f9c0b7a44",
    username: "adam.trento",
  },
} as Post;
const SLEPT: Post = { ...OTHERS, sleep: summary };
const NO_REACTIONS: ReactionsDoor = {
  of: async () => null,
  leave: async () => null,
  remove: async () => null,
};
const LINE = "Sleep score 82 · Very good · 7 h 32 min";

async function inDoors(children: React.ReactNode) {
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: "http://api",
        account: { state: signedIn, sessionEnded: jest.fn() },
        openProfile: jest.fn(),
      }}
    >
      <ReactionsContext.Provider value={NO_REACTIONS}>
        {children}
      </ReactionsContext.Provider>
    </FollowsContext.Provider>,
  );
  await act(async () => {});
}

const card = (post: Post) => (
  <FeedPost post={shownPost(post)} width={320} onOpen={jest.fn()} />
);
const page = (post: Post) => <PostPage post={shownPost(post)} onClose={jest.fn()} />;

/** The requests that ask for a night: none is ever needed. */
function sleepRequests(): string[] {
  return fetchSpy.mock.calls
    .map(([url]) => String(url))
    .filter((url) => /sleep/.test(url));
}

beforeEach(() => {
  on.mockReturnValue(true);
  forgetSleepNow();
  fetchSpy.mockReset();
  // The page reads the figures of the run; no answer is as a post without.
  fetchSpy.mockImplementation(async () => Response.json({}, { status: 404 }));
});

afterAll(() => {
  fetchSpy.mockRestore();
});

test("the card of a post with a night says it in a line, under its figures", async () => {
  await inDoors(card(SLEPT));
  expect(screen.getByTestId("sleep-line").props.children).toBe(LINE);
  expect(sleepRequests()).toEqual([]);
});

test("the page of the post has the card of the night, after the run's", async () => {
  await inDoors(page(SLEPT));
  const night = screen.getByTestId("post-sleep");
  expect(night).toBeTruthy();
  expect(screen.getByText("82 · Very good")).toBeTruthy();
  expect(screen.getByLabelText("Deep: 1 h 12 min")).toBeTruthy();
  expect(sleepRequests()).toEqual([]);
});

test.each([
  ["without a night", { ...OTHERS, sleep: null } as Post],
  ["from an API before the field", OTHERS],
])("a post %s shows none, on the card or on its page", async (_name, post) => {
  await inDoors(
    <>
      {card(post)}
      {page(post)}
    </>,
  );
  expect(screen.queryByTestId("sleep-line")).toBeNull();
  expect(screen.queryByTestId("post-sleep")).toBeNull();
});

test("in the builds of today the sleep in a post is off: a night given is not shown", async () => {
  on.mockReturnValue(false);
  await inDoors(
    <>
      {card(SLEPT)}
      {page(SLEPT)}
    </>,
  );
  expect(screen.queryByTestId("sleep-line")).toBeNull();
  expect(screen.queryByTestId("post-sleep")).toBeNull();
  expect(screen.queryByText(/Sleep/)).toBeNull();
  expect(sleepRequests()).toEqual([]);
});
