import type { FeedPost as ApiFeedPost } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { color, MIN_TAP_SIZE } from "../theme/tokens";
import { shownPost } from "./feedPosts";
import { PostActions, postOfDrawing } from "./PostActions";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

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

async function bar(mine: boolean, onEditRun?: () => void) {
  await render(
    <FollowsContext.Provider value={DOOR}>
      <PostActions post={shownPost(DRAWING)} mine={mine} onEditRun={onEditRun} />
    </FollowsContext.Provider>,
  );
}

test("«Like» opens the six reactions over the row, and closes them", async () => {
  await bar(false);
  expect(screen.queryByTestId("post-reactions")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Like" }));
  expect(screen.getByTestId("post-reactions")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Like" }));
  expect(screen.queryByTestId("post-reactions")).toBeNull();
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
