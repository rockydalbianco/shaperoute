import comments from "@shaperoute/shared-types/fixtures/comments.json";
import result from "@shaperoute/shared-types/fixtures/reaction-result.json";
import reactions from "@shaperoute/shared-types/fixtures/reactions.json";
import type {
  CommentsPage,
  FeedPost as ApiFeedPost,
  ReactionResult,
  ReactionsSummary,
} from "@shaperoute/shared-types";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { createRef, type Ref } from "react";
import { StyleSheet } from "react-native";

import { CommentsContext, type CommentsDoor } from "../social/commentsDoor";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { withMine } from "../social/reactionKinds";
import { ReactionsContext, type ReactionsDoor } from "../social/reactionsDoor";
import { color, fontWeight, MIN_TAP_SIZE } from "../theme/tokens";
import { shownPost } from "./feedPosts";
import { PostActions, postOfDrawing } from "./PostActions";
import type { PostReactionsHandle } from "./PostReactions";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// A Modal as iOS has it, which says it has gone: the super like's sheet
// waits for the bar of the six to be gone (TASK-358).
jest.mock("react-native/Libraries/Modal/Modal", () => ({
  __esModule: true,
  default: jest.requireActual("../messages/dismissingModal").default,
}));

// The four actions of a post (TASK-410 B and F), in the card of «Feed» and
// at the foot of its page.

const DRAWING: ApiFeedPost = {
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
  rotation_deg: 45,
  activity: "running",
  track_preview: [
    [46.0, 11.2],
    [46.01, 11.21],
  ],
  author: { public_id: "ada", username: "ada_runs" },
} as ApiFeedPost;

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

/** fire 3, super_like 2, clap 1, wow 1; mine: fire. */
const SUMMARY = reactions as ReactionsSummary;
const NOBODYS: ReactionsSummary = {
  counts: { super_like: 0, fire: 0, clap: 0, strong: 0, laugh: 0, wow: 0 },
  total: 0,
  mine: null,
};

/** The reactions of the post as the API reads them, and what it answers. */
function reactionsOf(
  read: ReactionsSummary,
  left: ReactionResult | null = null,
): ReactionsDoor {
  return {
    of: jest.fn(async () => ({ kind: "ok" as const, value: read })),
    leave: jest.fn(async () =>
      left === null ? null : { kind: "ok" as const, value: left },
    ),
    remove: jest.fn(async () => null),
  };
}

/** Comments that are `totals[0]` at the first reading, `totals[1]` at the next. */
function commentsOf(totals: number[]): CommentsDoor {
  const page = comments as CommentsPage;
  return {
    pageOf: jest.fn(async () => ({
      kind: "ok" as const,
      value: { ...page, total: totals.shift() ?? 0 },
    })),
    write: async () => null,
    remove: async () => null,
    photoOf: async () => null,
  };
}

type Doors = {
  reactions?: ReactionsDoor;
  comments?: CommentsDoor;
  /** For the picture of the post, which is not in the row. */
  handle?: Ref<PostReactionsHandle>;
};

async function bar(mine: boolean, onEditRun?: () => void, doors: Doors = {}) {
  let row = (
    <PostActions
      post={shownPost(DRAWING)}
      mine={mine}
      onEditRun={onEditRun}
      reactionsHandle={doors.handle}
    />
  );
  if (doors.reactions !== undefined) {
    row = (
      <ReactionsContext.Provider value={doors.reactions}>
        {row}
      </ReactionsContext.Provider>
    );
  }
  if (doors.comments !== undefined) {
    row = (
      <CommentsContext.Provider value={doors.comments}>{row}</CommentsContext.Provider>
    );
  }
  await render(<FollowsContext.Provider value={DOOR}>{row}</FollowsContext.Provider>);
}

const like = () => screen.getByTestId("post-like");

// TASK-454: a strip opened over the row and pushed the four buttons down.
test("«Like» hangs the six reactions over the row, and moves nothing", async () => {
  await bar(false, undefined, { reactions: reactionsOf(NOBODYS) });
  await waitFor(() =>
    expect(like()).toHaveProp("accessibilityState", { expanded: false }),
  );
  expect(screen.queryByTestId("post-reactions")).toBeNull();
  const before = screen.getByTestId("feed-actions").props.style;

  await fireEvent.press(screen.getByRole("button", { name: "Like" }));
  // Out of the flow, the bar and what closes it: the row stays where it was.
  expect(screen.getByTestId("post-reactions")).toHaveStyle({ position: "absolute" });
  expect(screen.getByTestId("post-reactions-outside")).toHaveStyle({
    position: "absolute",
  });
  expect(screen.getByTestId("feed-actions").props.style).toEqual(before);
  expect(like()).toHaveProp("accessibilityState", { expanded: true });

  await fireEvent.press(screen.getByTestId("post-reactions-outside"));
  expect(screen.queryByTestId("post-reactions")).toBeNull();
  expect(like()).toHaveProp("accessibilityState", { expanded: false });
});

test("without reactions to read, «Like» stays and opens nothing", async () => {
  await bar(false);
  await fireEvent.press(screen.getByRole("button", { name: "Like" }));
  expect(screen.queryByTestId("post-reactions")).toBeNull();
  expect(screen.getByText("Like")).toBeOnTheScreen();
});

test("nobody reacted: «Like» with its heart, and no number", async () => {
  const door = reactionsOf(NOBODYS);
  await bar(false, undefined, { reactions: door });
  await waitFor(() => expect(door.of).toHaveBeenCalledWith("d1"));
  expect(screen.getByText("Like")).not.toHaveStyle({ fontWeight: fontWeight.semibold });
  expect(
    screen.getByTestId("post-like-icon", { includeHiddenElements: true }),
  ).toBeTruthy();
  expect(like().props.accessibilityValue?.text).toBeUndefined();
});

test("others reacted: how many, as «Comment» says it", async () => {
  await bar(false, undefined, { reactions: reactionsOf(withMine(SUMMARY, null)) });
  const word = await screen.findByText("Like · 6");
  expect(word).not.toHaveStyle({ fontWeight: fontWeight.semibold });
  expect(
    screen.getByTestId("post-like-icon", { includeHiddenElements: true }),
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: "Like" })).toHaveProp(
    "accessibilityValue",
    {
      text: "6 reactions",
    },
  );
});

test("one's own reaction stands in place of the heart, the word in bold", async () => {
  await bar(false, undefined, { reactions: reactionsOf(SUMMARY) });
  const word = await screen.findByText("Like · 7");
  expect(word).toHaveStyle({ fontWeight: fontWeight.semibold, color: color.text });
  expect(
    screen.queryByTestId("post-like-icon", { includeHiddenElements: true }),
  ).toBeNull();
  // In the icon's own box: the row is as tall as before.
  const mark = screen.getByTestId("post-like-mark", { includeHiddenElements: true });
  expect(mark).toHaveStyle({ width: 22, height: 22 });
  expect(mark).toHaveProp("importantForAccessibility", "no-hide-descendants");
  expect(screen.getByTestId("mark-fire", { includeHiddenElements: true })).toBeTruthy();
  // A screen reader hears which, and how many.
  const button = screen.getByRole("button", { name: "Your reaction: Fire" });
  expect(button).toHaveProp("accessibilityValue", { text: "7 reactions" });
});

test("the MuW heart as one's own: the badge, not an emoji", async () => {
  await bar(false, undefined, {
    reactions: reactionsOf(withMine(SUMMARY, "super_like")),
  });
  await screen.findByText("Like · 7");
  expect(
    screen.getByTestId("heart-badge", { includeHiddenElements: true }),
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Your reaction: MuW heart, super like" }),
  ).toBeOnTheScreen();
});

// S3 of the try-out of 2026-11-11: the comment of a super like was kept, and
// the card went on saying «Comment · 2» until the Feed was loaded again.
test("after a super like its comment is among the post's comments", async () => {
  const read = commentsOf([2, 3]);
  const door = reactionsOf(withMine(SUMMARY, null), result as ReactionResult);
  await bar(false, undefined, { reactions: door, comments: read });
  expect(await screen.findByText("Comment · 2")).toBeOnTheScreen();
  await screen.findByText("Like · 6");

  await fireEvent.press(like());
  await fireEvent.press(screen.getByRole("button", { name: "MuW heart, super like" }));
  await screen.findByRole("header", { name: "Super like" });
  await fireEvent.changeText(screen.getByLabelText("Comment"), "What a heart!");
  await fireEvent.press(screen.getByRole("button", { name: "Send" }));

  expect(door.leave).toHaveBeenCalledWith("d1", "super_like", "What a heart!");
  expect(await screen.findByText("Comment · 3")).toBeOnTheScreen();
  expect(read.pageOf).toHaveBeenCalledTimes(2);
  expect(screen.getByText("Like · 7")).toHaveStyle({ fontWeight: fontWeight.semibold });
});

// Part B, the user's choice of 2026-11-11: two taps on the picture of the
// post are its super like. The picture is drawn by who draws the row.
describe("a double tap on the picture of the post", () => {
  test("is the super like, and «Comment» counts its comment", async () => {
    const read = commentsOf([2, 3]);
    const door = reactionsOf(withMine(SUMMARY, null), result as ReactionResult);
    const handle = createRef<PostReactionsHandle>();
    await bar(false, undefined, { reactions: door, comments: read, handle });
    await screen.findByText("Comment · 2");
    await screen.findByText("Like · 6");

    await act(async () => handle.current?.superLike());
    // The sheet, without the bar of the six in between.
    await screen.findByRole("header", { name: "Super like" });
    expect(screen.queryByTestId("post-reactions")).toBeNull();
    expect(like()).not.toBeExpanded();
    await fireEvent.changeText(screen.getByLabelText("Comment"), "What a heart!");
    await fireEvent.press(screen.getByRole("button", { name: "Send" }));

    expect(door.leave).toHaveBeenCalledWith("d1", "super_like", "What a heart!");
    expect(await screen.findByText("Comment · 3")).toBeOnTheScreen();
    expect(screen.getByText("Like · 7")).toHaveStyle({
      fontWeight: fontWeight.semibold,
    });
  });

  test("on one's own post too, as the heart of the bar there", async () => {
    const door = reactionsOf(withMine(SUMMARY, null), result as ReactionResult);
    const handle = createRef<PostReactionsHandle>();
    await bar(true, undefined, { reactions: door, handle });
    await screen.findByText("Like · 6");
    await act(async () => handle.current?.superLike());
    expect(await screen.findByRole("header", { name: "Super like" })).toBeOnTheScreen();
    expect(door.leave).not.toHaveBeenCalled();
  });

  test("with the super like already there «Like» stays as it is", async () => {
    const door = reactionsOf(withMine(SUMMARY, "super_like"));
    const handle = createRef<PostReactionsHandle>();
    await bar(false, undefined, { reactions: door, handle });
    await screen.findByText("Like · 7");
    const before = screen.getByTestId("post-like").props.accessibilityLabel;
    await act(async () => handle.current?.superLike());
    expect(screen.getByTestId("super-like-heart")).toBeOnTheScreen();
    expect(screen.queryByRole("header", { name: "Super like" })).toBeNull();
    expect(door.remove).not.toHaveBeenCalled();
    expect(door.leave).not.toHaveBeenCalled();
    expect(screen.getByTestId("post-like").props.accessibilityLabel).toBe(before);
  });

  test("without reactions to read it does nothing", async () => {
    const handle = createRef<PostReactionsHandle>();
    await bar(false, undefined, { handle });
    await act(async () => handle.current?.superLike());
    expect(screen.queryByRole("header", { name: "Super like" })).toBeNull();
    expect(screen.queryByTestId("super-like-heart")).toBeNull();
  });
});

test("a reaction the API did not keep: a notice under the row", async () => {
  // `leave` answers nothing: the reaction comes back as it was.
  await bar(false, undefined, { reactions: reactionsOf(SUMMARY) });
  await screen.findByText("Like · 7");
  await fireEvent.press(like());
  await fireEvent.press(screen.getByRole("button", { name: "Wow" }));
  expect(
    await screen.findByText("Your reaction wasn't saved. Check the connection."),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Your reaction: Fire" })).toBeOnTheScreen();
});

test("«Share» only on one's own drawings", async () => {
  await bar(false);
  expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
  await bar(true);
  expect(screen.getByRole("button", { name: "Share" })).toBeOnTheScreen();
});

test("«Edit & run» is the yellow word, and only when there is a line to run", async () => {
  await bar(false);
  expect(screen.queryByRole("button", { name: "Edit & run" })).toBeNull();
  const edit = jest.fn();
  await bar(false, edit);
  await fireEvent.press(screen.getByRole("button", { name: "Edit & run" }));
  expect(edit).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Edit & run")).toHaveStyle({ color: color.accent });
});

// TASK-444: emoji in colours stood over the words, beside the bar's lines.
test("each action has a line icon, hidden from a screen reader; no emoji", async () => {
  await bar(true, () => {});
  // No «Comment» here: under jest there is no API to ask for the comments.
  for (const id of ["post-like", "post-share", "post-edit-run"]) {
    const icon = screen.getByTestId(`${id}-icon`, { includeHiddenElements: true });
    expect(icon).toHaveProp("accessible", false);
    expect(icon).toHaveProp("importantForAccessibility", "no");
    expect(icon).toHaveStyle({
      tintColor: id === "post-edit-run" ? color.accent : color.text,
    });
  }
  expect(screen.queryByText(/\p{Extended_Pictographic}/u)).toBeNull();
});

test("every button is big enough to touch", async () => {
  await bar(true, () => {});
  for (const button of screen.getAllByRole("button")) {
    const { minHeight } = StyleSheet.flatten(button.props.style);
    expect(minHeight).toBeGreaterThanOrEqual(MIN_TAP_SIZE);
  }
});

test("a drawing's post sends only the cut track, and keeps nothing", () => {
  const post = postOfDrawing(shownPost(DRAWING));
  expect(post.key).toBeNull();
  expect(post.track).toEqual(DRAWING.track_preview);
  expect(post.durationMs).toBe(1_800_000);
  expect(post.rotationDeg).toBe(45);
});
