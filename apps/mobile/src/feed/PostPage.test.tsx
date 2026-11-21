import drawingDetails from "@shaperoute/shared-types/fixtures/drawing-details.json";
import feed from "@shaperoute/shared-types/fixtures/feed.json";
import reactions from "@shaperoute/shared-types/fixtures/reactions.json";
import runStats from "@shaperoute/shared-types/fixtures/run-stats.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type {
  FeedPost as Post,
  ReactionsSummary,
  Session,
} from "@shaperoute/shared-types";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react-native";

import type { AccountState } from "../account/useAccount";
import { FollowsContext } from "../social/followsDoor";
import { ReactionsContext, type ReactionsDoor } from "../social/reactionsDoor";
import { EditRunContext } from "./editRunDoor";
import { forgetFeedMaps } from "./FeedMaps";
import { shownPost } from "./feedPosts";
import { PostPage } from "./PostPage";

jest.mock("expo-file-system");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// The page of a post (TASK-410, ADR-0340): who, the drawing still, the
// summary with what there is, and the bar of four at its foot.

const URL = "http://api";
const signedIn: AccountState = { status: "signedIn", session: session as Session };
const MINE = feed.posts[0] as Post;
const OTHERS = {
  ...MINE,
  author: {
    public_id: "3b9d2e10-7c4a-4f8e-a1d6-5e2f9c0b7a44",
    username: "adam.trento",
  },
} as Post;

/** No reactions to read, as on a page shown alone: «Like» opens nothing. */
const NO_REACTIONS: ReactionsDoor = {
  of: async () => null,
  leave: async () => null,
  remove: async () => null,
};
/** Seven reactions read, one of them one's own. */
const SEVEN: ReactionsDoor = {
  ...NO_REACTIONS,
  of: async () => ({ kind: "ok", value: reactions as ReactionsSummary }),
};

async function show(post: Post, edit = jest.fn(), door = NO_REACTIONS) {
  const onClose = jest.fn();
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: URL,
        account: { state: signedIn, sessionEnded: jest.fn() },
        openProfile: jest.fn(),
      }}
    >
      <ReactionsContext.Provider value={door}>
        <EditRunContext.Provider
          value={(line) => (line.length >= 2 ? edit : undefined)}
        >
          <PostPage post={shownPost(post)} onClose={onClose} />
        </EditRunContext.Provider>
      </ReactionsContext.Provider>
    </FollowsContext.Provider>,
  );
  return { onClose, edit };
}

let fetchSpy: jest.SpyInstance;

/** GET /drawings/{id} answers the post whole, with `stats` as given. */
function detailWith(stats: unknown) {
  fetchSpy.mockImplementation(async () => Response.json({ ...drawingDetails, stats }));
}

beforeEach(() => {
  forgetFeedMaps();
  fetchSpy = jest.spyOn(global, "fetch");
  detailWith(null);
});

afterEach(() => {
  fetchSpy.mockRestore();
});

test("the author's letter at the top, as big as the page wants", async () => {
  await show(OTHERS);
  expect(screen.getByText("adam.trento")).toBeOnTheScreen();
  // No picture before TASK-355 B: the letter.
  expect(screen.getByText("A")).toBeOnTheScreen();
  expect(screen.queryByTestId("avatar-photo")).toBeNull();
});

test("the title, the description and the summary of what there is", async () => {
  await show(OTHERS);
  expect(screen.getByText("Sunday heart by the river")).toBeOnTheScreen();
  expect(screen.getByText(/Legs heavy after the bridge/)).toBeOnTheScreen();
  const summary = within(screen.getByTestId("post-summary"));
  expect(summary.getByText("Summary")).toBeOnTheScreen();
  expect(summary.getByText("4.00 km")).toBeOnTheScreen();
  expect(summary.getByText("19:00")).toBeOnTheScreen();
  expect(summary.getByText("4:45 /km")).toBeOnTheScreen();
  // An old post has no splits, no climb, no heart: no cards for them.
  expect(screen.queryByText("Splits")).toBeNull();
  expect(screen.queryByText("Heart rate")).toBeNull();
});

test("on somebody else's post: like, edit & run, no share and no settings", async () => {
  const { edit } = await show(OTHERS);
  expect(screen.getByTestId("post-like")).toBeOnTheScreen();
  expect(screen.queryByTestId("post-share")).toBeNull();
  expect(screen.queryByTestId("post-sheet-handle")).toBeNull();
  await fireEvent.press(screen.getByTestId("post-edit-run"));
  expect(edit).toHaveBeenCalledTimes(1);
});

test("on one's own post: share, and the handle of the settings", async () => {
  await show(MINE);
  expect(screen.getByTestId("post-share")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Post settings" })).toBeOnTheScreen();
  expect(screen.queryByTestId("post-settings")).toBeNull();
});

// TASK-454: the six hang over the bar and move nothing; a strip used to
// open above it and push the four buttons down.
test("«Like» hangs the six reactions over the bar; a tap elsewhere closes them", async () => {
  await show(OTHERS, jest.fn(), SEVEN);
  expect(await screen.findByText("Like · 7")).toBeOnTheScreen();
  expect(screen.queryByTestId("post-reactions")).toBeNull();
  await fireEvent.press(screen.getByTestId("post-like"));
  expect(screen.getByTestId("post-reactions")).toHaveStyle({ position: "absolute" });
  await fireEvent.press(screen.getByTestId("post-reactions-outside"));
  expect(screen.queryByTestId("post-reactions")).toBeNull();
});

test("on the snow and at the gym no «Edit & run»", async () => {
  await show({ ...OTHERS, activity: "skiing" });
  expect(screen.queryByTestId("post-edit-run")).toBeNull();
});

test("«Back» closes the page", async () => {
  const { onClose } = await show(OTHERS);
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("a tap on the drawing opens it on the map, as from the card before", async () => {
  const onMap = jest.fn();
  await render(<PostPage post={shownPost(OTHERS)} onClose={jest.fn()} onMap={onMap} />);
  await fireEvent.press(screen.getByTestId("post-map"));
  // The tap waits to know it is alone (TASK-454 part B).
  await waitFor(() => expect(onMap).toHaveBeenCalledTimes(1));
});

// --- The figures of the post (TASK-410 part D) ---

test("with the figures of the post: splits, elevation, heart rate", async () => {
  detailWith(runStats);
  await show(OTHERS);
  await screen.findByTestId("post-splits");
  expect(String(fetchSpy.mock.calls[0][0])).toBe(`${URL}/drawings/${OTHERS.id}`);
  const splits = within(screen.getByTestId("post-splits"));
  expect(splits.getByText("Splits")).toBeOnTheScreen();
  expect(splits.getByText("Fastest: km 3 · 4:59 /km")).toBeOnTheScreen();
  expect(splits.getByText("0.43")).toBeOnTheScreen();
  expect(splits.getAllByTestId("split-bar")).toHaveLength(4);
  const elevation = within(screen.getByTestId("post-elevation"));
  expect(elevation.getByText("+21 m")).toBeOnTheScreen();
  expect(
    elevation.getByLabelText("Elevation along the route, from 194 to 215 m"),
  ).toBeOnTheScreen();
  const heart = within(screen.getByTestId("post-heart"));
  expect(heart.getByText("148 bpm")).toBeOnTheScreen();
  expect(heart.getByText("171 bpm")).toBeOnTheScreen();
  // The summary takes the fastest kilometre and the author's calories.
  const summary = within(screen.getByTestId("post-summary"));
  expect(summary.getByText("Fastest km")).toBeOnTheScreen();
  expect(summary.getByText("355 kcal")).toBeOnTheScreen();
});

test("a post without figures, or an API that cannot be reached: the summary only", async () => {
  await show(OTHERS);
  await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
  expect(screen.getByTestId("post-summary")).toBeOnTheScreen();
  expect(screen.queryByTestId("post-splits")).toBeNull();
  expect(screen.queryByTestId("post-elevation")).toBeNull();
  expect(screen.queryByTestId("post-heart")).toBeNull();
  fetchSpy.mockRejectedValue(new Error("offline"));
  await show(OTHERS);
  expect(screen.queryByTestId("post-splits")).toBeNull();
});
