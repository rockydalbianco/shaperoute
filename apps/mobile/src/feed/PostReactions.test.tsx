import result from "@shaperoute/shared-types/fixtures/reaction-result.json";
import reactions from "@shaperoute/shared-types/fixtures/reactions.json";
import type { ReactionResult, ReactionsSummary } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { createRef, type RefObject, useState } from "react";
import { AccessibilityInfo, Alert, Platform, StyleSheet, Text } from "react-native";

import type { AccountOutcome } from "../api/accounts";
import { REACTION_BAR_HEIGHT } from "../social/DrawingReactions";
import { HEART_ALONE_MS } from "../social/SuperLikeSheet";
import { ReactionsContext, type ReactionsDoor } from "../social/reactionsDoor";
import { withMine } from "../social/reactionKinds";
import { useDrawingReactions } from "../social/useDrawingReactions";
import { space } from "../theme/tokens";
import {
  barPlace,
  PostReactions,
  type PostReactionsHandle,
  type RowBox,
} from "./PostReactions";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// A Modal as iOS has it, which says it has gone: the super like's sheet
// waits for the bar to be gone (TASK-358). React Native's mock never says so.
jest.mock("react-native/Libraries/Modal/Modal", () => ({
  __esModule: true,
  default: jest.requireActual("../messages/dismissingModal").default,
}));

// The six reactions of a post, hanging over its «Like» (TASK-454 part A).

const DRAWING = "3f9d2c71-8a4b-4e06-b5d1-c27e9a40f815";
/** fire 3, super_like 2, clap 1, wow 1; mine: fire. */
const SUMMARY = reactions as ReactionsSummary;
const WITHOUT_MINE = withMine(SUMMARY, null);
const SUPER_LIKED = result as ReactionResult;
const HEART = "MuW heart, super like";
const ROW: RowBox = { x: 16, y: 600, width: 343 };
const REJECTED = {
  kind: "api_error",
  code: "comment_rejected",
  message: "Not kind",
  suggested_distance_m: null,
  reason: "negative",
  retryAfterS: null,
} as const;

function ok<T>(value: T): AccountOutcome<T> {
  return { kind: "ok", value };
}

/** A door that reads `read`, and answers each change with the next of its list. */
function door(
  read: ReactionsSummary,
  leaves: (AccountOutcome<ReactionResult> | null)[] = [],
  removes: (AccountOutcome<ReactionsSummary> | null)[] = [],
): ReactionsDoor {
  return {
    of: jest.fn(async () => ok(read)),
    leave: jest.fn(async () => leaves.shift() ?? null),
    remove: jest.fn(async () => removes.shift() ?? null),
  };
}

const onSuperLiked = jest.fn();
const onClose = jest.fn();

type PostProps = {
  row: RowBox | null;
  /** The bar up at once, as after «Like»; down, as under a picture. */
  up?: boolean;
  handle?: RefObject<PostReactionsHandle | null>;
};

/** The row of a post would do this: the reactions read, the bar up at once. */
function Post({ row, up = true, handle }: PostProps) {
  const read = useDrawingReactions(DRAWING);
  const [open, setOpen] = useState(up);
  return (
    <>
      <Text>{`${read.status}, mine: ${read.mine}`}</Text>
      <PostReactions
        reactions={read}
        open={open && read.status === "ready"}
        row={row}
        onClose={() => {
          setOpen(false);
          onClose();
        }}
        onSuperLiked={onSuperLiked}
        handle={handle}
      />
    </>
  );
}

/** The bar up over the row, the reactions read. */
async function hung(value: ReactionsDoor, row: RowBox | null = ROW) {
  await render(
    <ReactionsContext.Provider value={value}>
      <Post row={row} />
    </ReactionsContext.Provider>,
  );
  return screen.findByTestId("post-reactions");
}

/** The bar down, the reactions read: what two taps on the picture ask. */
async function underPicture(value: ReactionsDoor, up = false) {
  const handle = createRef<PostReactionsHandle>();
  await render(
    <ReactionsContext.Provider value={value}>
      <Post row={ROW} up={up} handle={handle} />
    </ReactionsContext.Provider>,
  );
  await screen.findByText(/^ready, mine: /);
  return () => act(async () => handle.current?.superLike());
}

const choice = (name: string) => screen.getByRole("button", { name });

async function write(text: string) {
  await fireEvent.changeText(screen.getByLabelText("Comment"), text);
  await fireEvent.press(screen.getByRole("button", { name: "Send" }));
}

beforeEach(() => {
  onSuperLiked.mockClear();
  onClose.mockClear();
});

test("the bar hangs a little over the row, from its start, no wider than it", () => {
  expect(barPlace(ROW, 59)).toEqual({
    top: 600 - REACTION_BAR_HEIGHT - space.xs,
    left: 16 + space.sm,
    maxWidth: 343 - 2 * space.sm,
  });
  // A row right under the clock: the bar stays under it, over the row.
  expect(barPlace({ ...ROW, y: 70 }, 59).top).toBe(59 + space.xs);
});

test("the six, one's own marked, out of the page's flow", async () => {
  const bar = await hung(door(SUMMARY));
  for (const name of [HEART, "Fire", "Clap", "Strong", "Laugh", "Wow"]) {
    expect(choice(name)).toBeOnTheScreen();
  }
  expect(choice("Fire")).toBeSelected();
  expect(choice("Clap")).not.toBeSelected();
  // Over the row, where it is: nothing under it moves.
  expect(StyleSheet.flatten(bar.props.style)).toMatchObject({
    position: "absolute",
    ...barPlace(ROW, 0),
  });
  expect(
    StyleSheet.flatten(screen.getByTestId("post-reactions-outside").props.style),
  ).toMatchObject({ position: "absolute" });
});

test("until the row says where it is, the bar is not seen", async () => {
  const bar = await hung(door(SUMMARY), null);
  expect(bar).toHaveStyle({ position: "absolute", opacity: 0 });
});

test("a tap anywhere else closes it and changes nothing", async () => {
  const value = door(SUMMARY);
  await hung(value);
  await fireEvent.press(screen.getByRole("button", { name: "Close" }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("post-reactions")).toBeNull();
  expect(value.leave).not.toHaveBeenCalled();
  expect(value.remove).not.toHaveBeenCalled();
});

test("an emoji chosen is left, and the bar goes", async () => {
  const value = door(SUMMARY, [
    ok({ reactions: withMine(SUMMARY, "clap"), comment: null }),
  ]);
  await hung(value);
  await fireEvent.press(choice("Clap"));
  expect(value.leave).toHaveBeenCalledWith(DRAWING, "clap", null);
  expect(screen.queryByTestId("post-reactions")).toBeNull();
  expect(await screen.findByText("ready, mine: clap")).toBeOnTheScreen();
  // No words asked for an emoji.
  expect(screen.queryByRole("header", { name: "Super like" })).toBeNull();
});

test("one's own chosen again takes it away", async () => {
  const value = door(SUMMARY, [], [ok(WITHOUT_MINE)]);
  await hung(value);
  await fireEvent.press(choice("Fire"));
  expect(value.remove).toHaveBeenCalledWith(DRAWING);
  expect(value.leave).not.toHaveBeenCalled();
  expect(await screen.findByText("ready, mine: null")).toBeOnTheScreen();
});

describe("the MuW heart", () => {
  test("asks for its comment once the bar is gone, and counts with it", async () => {
    const value = door(SUMMARY, [ok(SUPER_LIKED)]);
    await hung(value);
    await fireEvent.press(choice(HEART));

    // Nothing left yet: the sheet, with who will read the comment.
    expect(screen.queryByTestId("post-reactions")).toBeNull();
    expect(value.leave).not.toHaveBeenCalled();
    expect(await screen.findByRole("header", { name: "Super like" })).toBeOnTheScreen();
    expect(
      screen.getByText(
        "A super like comes with a comment. Everyone who sees the post can read it.",
      ),
    ).toBeOnTheScreen();

    await write("What a heart!");
    expect(value.leave).toHaveBeenCalledWith(DRAWING, "super_like", "What a heart!");
    expect(await screen.findByText("ready, mine: super_like")).toBeOnTheScreen();
    await waitFor(() =>
      expect(screen.queryByRole("header", { name: "Super like" })).toBeNull(),
    );
    expect(onSuperLiked).toHaveBeenCalledTimes(1);
  });

  test("on Android the sheet does not wait for the bar", async () => {
    const os = jest.replaceProperty(Platform, "OS", "android");
    await hung(door(SUMMARY));
    await fireEvent.press(choice(HEART));
    expect(screen.getByRole("header", { name: "Super like" })).toBeOnTheScreen();
    os.restore();
  });

  test("«Cancel» leaves nothing", async () => {
    const value = door(SUMMARY);
    await hung(value);
    await fireEvent.press(choice(HEART));
    await screen.findByRole("header", { name: "Super like" });
    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("header", { name: "Super like" })).toBeNull(),
    );
    expect(value.leave).not.toHaveBeenCalled();
    expect(onSuperLiked).not.toHaveBeenCalled();
    expect(screen.getByText("ready, mine: fire")).toBeOnTheScreen();
  });

  test("a negative comment: the alert, and neither the heart nor the words", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    await hung(door(SUMMARY, [REJECTED]));
    await fireEvent.press(choice(HEART));
    await screen.findByRole("header", { name: "Super like" });
    await write("You run badly");
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        "You can't write negative comments in this app. Try another app.",
      ),
    );
    // The sheet stays, with the words to change.
    expect(screen.getByLabelText("Comment")).toHaveProp("value", "You run badly");
    expect(onSuperLiked).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  test("one's own in the bar takes it away, without asking for words", async () => {
    const value = door(withMine(SUMMARY, "super_like"), [], [ok(WITHOUT_MINE)]);
    await hung(value);
    await fireEvent.press(choice(HEART));
    expect(value.remove).toHaveBeenCalledWith(DRAWING);
    expect(await screen.findByText("ready, mine: null")).toBeOnTheScreen();
    expect(screen.queryByRole("header", { name: "Super like" })).toBeNull();
  });
});

// Part B, the user's choice of 2026-11-11: two taps on the picture of a post.
describe("a double tap on the picture", () => {
  test("asks for the super like's comment, and leaves nothing before it", async () => {
    const value = door(WITHOUT_MINE, [ok(SUPER_LIKED)]);
    const doubleTap = await underPicture(value);
    await doubleTap();

    expect(await screen.findByRole("header", { name: "Super like" })).toBeOnTheScreen();
    expect(screen.queryByTestId("post-reactions")).toBeNull();
    expect(value.leave).not.toHaveBeenCalled();

    await write("What a heart!");
    expect(value.leave).toHaveBeenCalledWith(DRAWING, "super_like", "What a heart!");
    expect(await screen.findByText("ready, mine: super_like")).toBeOnTheScreen();
    expect(onSuperLiked).toHaveBeenCalledTimes(1);
  });

  test("over an emoji of one's own: the super like takes its place", async () => {
    const value = door(SUMMARY, [ok(SUPER_LIKED)]);
    const doubleTap = await underPicture(value);
    await doubleTap();
    await screen.findByRole("header", { name: "Super like" });
    // Until the comment went, the emoji is still one's own.
    expect(screen.getByText("ready, mine: fire")).toBeOnTheScreen();
    expect(value.remove).not.toHaveBeenCalled();
  });

  test("«Cancel» leaves nothing", async () => {
    const value = door(WITHOUT_MINE);
    const doubleTap = await underPicture(value);
    await doubleTap();
    await screen.findByRole("header", { name: "Super like" });
    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("header", { name: "Super like" })).toBeNull(),
    );
    expect(value.leave).not.toHaveBeenCalled();
    expect(screen.getByText("ready, mine: null")).toBeOnTheScreen();
  });

  test("with the super like already there: the heart, and nothing changes", async () => {
    const value = door(withMine(SUMMARY, "super_like"));
    const doubleTap = await underPicture(value);
    await doubleTap();
    expect(screen.getByTestId("super-like-heart")).toBeOnTheScreen();
    // Never taken away by a double tap, and no words asked again.
    expect(screen.queryByRole("header", { name: "Super like" })).toBeNull();
    expect(value.remove).not.toHaveBeenCalled();
    expect(value.leave).not.toHaveBeenCalled();
    expect(screen.getByText("ready, mine: super_like")).toBeOnTheScreen();
  });

  test("the heart goes by itself, and comes again at the next", async () => {
    jest.useFakeTimers();
    const doubleTap = await underPicture(door(withMine(SUMMARY, "super_like")));
    await doubleTap();
    expect(screen.getByTestId("super-like-heart")).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(HEART_ALONE_MS);
    });
    expect(screen.queryByTestId("super-like-heart")).toBeNull();
    await doubleTap();
    expect(screen.getByTestId("super-like-heart")).toBeOnTheScreen();
    jest.useRealTimers();
  });

  test("without reactions to read it does nothing", async () => {
    const handle = createRef<PostReactionsHandle>();
    const value: ReactionsDoor = {
      of: jest.fn(async () => null),
      leave: jest.fn(async () => null),
      remove: jest.fn(async () => null),
    };
    await render(
      <ReactionsContext.Provider value={value}>
        <Post row={ROW} up={false} handle={handle} />
      </ReactionsContext.Provider>,
    );
    await waitFor(() => expect(value.of).toHaveBeenCalled());
    await act(async () => handle.current?.superLike());
    expect(screen.queryByRole("header", { name: "Super like" })).toBeNull();
    expect(screen.queryByTestId("super-like-heart")).toBeNull();
  });

  test("while the bar is up it does nothing: the bar is what was asked", async () => {
    const value = door(WITHOUT_MINE);
    const doubleTap = await underPicture(value, true);
    await doubleTap();
    expect(screen.getByTestId("post-reactions")).toBeOnTheScreen();
    expect(screen.queryByRole("header", { name: "Super like" })).toBeNull();
  });

  test("a second one while the sheet is up changes nothing", async () => {
    const value = door(WITHOUT_MINE);
    const doubleTap = await underPicture(value);
    await doubleTap();
    await screen.findByRole("header", { name: "Super like" });
    await fireEvent.changeText(screen.getByLabelText("Comment"), "What a");
    await doubleTap();
    expect(screen.getByLabelText("Comment")).toHaveProp("value", "What a");
    expect(screen.getAllByRole("header", { name: "Super like" })).toHaveLength(1);
  });

  test("with «Reduce Motion» it asks the same", async () => {
    const reduced = jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(true);
    const value = door(WITHOUT_MINE);
    const doubleTap = await underPicture(value);
    await doubleTap();
    expect(await screen.findByRole("header", { name: "Super like" })).toBeOnTheScreen();
    expect(value.leave).not.toHaveBeenCalled();
    reduced.mockRestore();
  });
});
