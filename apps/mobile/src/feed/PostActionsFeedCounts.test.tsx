/**
 * A card of «Feed» told its counts by the page (TASK-355 part B): no request
 * for its reactions nor its comments; the comments are read when the sheet
 * first opens; one's own reaction goes and the API's answer takes the place
 * of what the page said. Without the counts (an API of before, the search,
 * the contests), the card asks as before.
 */
import comments from "@shaperoute/shared-types/fixtures/comments.json";
import result from "@shaperoute/shared-types/fixtures/reaction-result.json";
import reactions from "@shaperoute/shared-types/fixtures/reactions.json";
import type {
  CommentsPage,
  FeedPost as ApiFeedPost,
  ReactionResult,
  ReactionsSummary,
} from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { CommentsContext, type CommentsDoor } from "../social/commentsDoor";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { ReactionsContext, type ReactionsDoor } from "../social/reactionsDoor";
import { shownPost } from "./feedPosts";
import { PostActions } from "./PostActions";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

jest.mock("react-native/Libraries/Modal/Modal", () => ({
  __esModule: true,
  default: jest.requireActual("../messages/dismissingModal").default,
}));

const DRAWING = {
  id: "d1",
  title: "Morning",
  started_at: "2026-10-30T08:00:00Z",
  published_at: "2026-10-30T10:00:00Z",
  place: "Caldonazzo",
  shape: "moon",
  word: null,
  style: null,
  route_title: null,
  distance_m: 5000,
  duration_s: 1800,
  score: null,
  fidelity: null,
  rotation_deg: null,
  activity: "running",
  track_preview: [
    [46.0, 11.2],
    [46.01, 11.21],
  ],
  author: { public_id: "ada", username: "ada_runs", photo: null },
} as ApiFeedPost;

const COUNTED: ApiFeedPost = {
  ...DRAWING,
  reactions: { total: 5, mine: null },
  comments: 3,
};

const DOOR = {
  apiUrl: "http://api.test",
  account: {
    state: {
      status: "signedIn",
      session: { token: "t", user: { id: "u", public_id: "me" } },
    },
    sessionEnded: () => {},
  },
} as unknown as FollowsDoor;

function reactionsDoor(left: ReactionResult | null = null): ReactionsDoor {
  return {
    of: jest.fn(async () => ({
      kind: "ok" as const,
      value: reactions as ReactionsSummary,
    })),
    leave: jest.fn(async () =>
      left === null ? null : { kind: "ok" as const, value: left },
    ),
    remove: jest.fn(async () => null),
  };
}

function commentsDoor(total: number): CommentsDoor {
  return {
    pageOf: jest.fn(async () => ({
      kind: "ok" as const,
      value: { ...(comments as CommentsPage), total },
    })),
    write: async () => null,
    remove: async () => null,
    photoOf: async () => null,
  };
}

async function card(drawing: ApiFeedPost, r: ReactionsDoor, c: CommentsDoor) {
  await render(
    <FollowsContext.Provider value={DOOR}>
      <ReactionsContext.Provider value={r}>
        <CommentsContext.Provider value={c}>
          <PostActions post={shownPost(drawing)} mine={false} />
        </CommentsContext.Provider>
      </ReactionsContext.Provider>
    </FollowsContext.Provider>,
  );
}

test("told by the page, the card asks nothing and shows the counts", async () => {
  const r = reactionsDoor();
  const c = commentsDoor(9);
  await card(COUNTED, r, c);
  expect(screen.getByText("Like · 5")).toBeOnTheScreen();
  expect(screen.getByText("Comment · 3")).toBeOnTheScreen();
  await new Promise((done) => setTimeout(done, 0));
  expect(r.of).not.toHaveBeenCalled();
  expect(c.pageOf).not.toHaveBeenCalled();
});

test("one's own reaction on the page shows at once", async () => {
  await card(
    { ...COUNTED, reactions: { total: 2, mine: "fire" } },
    reactionsDoor(),
    commentsDoor(0),
  );
  expect(screen.getByText("Like · 2")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: /^Your reaction/ })).toBeOnTheScreen();
});

test("the comments are read when their sheet first opens", async () => {
  const c = commentsDoor(4);
  await card(COUNTED, reactionsDoor(), c);
  await fireEvent.press(screen.getByTestId("post-comment"));
  await waitFor(() => expect(c.pageOf).toHaveBeenCalledWith("d1", null));
  expect(await screen.findByText("Comment · 4")).toBeOnTheScreen();
});

test("a reaction left from the page's counts goes, and the API's answer stays", async () => {
  const r = reactionsDoor(result as ReactionResult);
  await card(COUNTED, r, commentsDoor(3));
  await fireEvent.press(screen.getByRole("button", { name: "Like" }));
  await fireEvent.press(screen.getByRole("button", { name: "Wow" }));
  await waitFor(() => expect(r.leave).toHaveBeenCalledWith("d1", "wow", null));
  const answered = (result as ReactionResult).reactions.total;
  expect(await screen.findByText(`Like · ${answered}`)).toBeOnTheScreen();
  expect(r.of).not.toHaveBeenCalled();
});

test("without the counts, as from an API of before, the card asks as before", async () => {
  const r = reactionsDoor();
  const c = commentsDoor(2);
  await card(DRAWING, r, c);
  await waitFor(() => expect(r.of).toHaveBeenCalledWith("d1"));
  await waitFor(() => expect(c.pageOf).toHaveBeenCalledWith("d1", null));
  expect(await screen.findByText("Comment · 2")).toBeOnTheScreen();
});
