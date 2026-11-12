import reactions from "@shaperoute/shared-types/fixtures/comment-reactions.json";
import type { CommentReactions } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { color, MIN_TAP_SIZE } from "../theme/tokens";
import { COMMENT_ACTIONS_HEIGHT, CommentActions } from "./CommentActions";
import { NO_COMMENT_REACTIONS, withMyReaction } from "./commentThreads";

// Under a comment: «Reply» and its reactions (TASK-454 part C, ADR-0377).

/** fire 3, wow 1; mine: fire. */
const MINE = reactions as CommentReactions;
const OTHERS = withMyReaction(MINE, null);

const onReply = jest.fn();
const onReact = jest.fn();

async function line(shown: CommentReactions) {
  await render(
    <CommentActions reactions={shown} onReply={onReply} onReact={onReact} testID="c" />,
  );
}

const button = (name: string) => screen.getByRole("button", { name });

beforeEach(() => {
  onReply.mockClear();
  onReact.mockClear();
});

test("nobody reacted: «Reply», the line heart, and no count", async () => {
  await line(NO_COMMENT_REACTIONS);
  await fireEvent.press(button("Reply"));
  expect(onReply).toHaveBeenCalledTimes(1);
  expect(button("React")).toBeOnTheScreen();
  expect(screen.queryByTestId("c-summary")).toBeNull();
  expect(screen.queryByText(/\p{Extended_Pictographic}/u)).toBeNull();
});

test("others reacted: the most used and how many", async () => {
  await line(OTHERS);
  expect(button("React")).toBeOnTheScreen();
  expect(screen.getByTestId("c-summary")).toHaveProp(
    "accessibilityLabel",
    "3 reactions",
  );
  expect(screen.getByText("3")).toBeOnTheScreen();
  expect(screen.getByText("🔥")).toBeOnTheScreen();
  expect(screen.getByText("😮")).toBeOnTheScreen();
});

test("one's own stands on the button, once", async () => {
  await line(MINE);
  expect(button("Your reaction: Fire")).toBeOnTheScreen();
  expect(screen.getAllByText("🔥")).toHaveLength(1);
  expect(screen.getByText("4")).toBeOnTheScreen();
});

test("the button turns the line into the five, one's own marked; no MuW heart", async () => {
  await line(MINE);
  await fireEvent.press(button("Your reaction: Fire"));
  for (const name of ["Fire", "Clap", "Strong", "Laugh", "Wow"]) {
    expect(button(name)).toBeOnTheScreen();
  }
  expect(screen.queryByRole("button", { name: "MuW heart, super like" })).toBeNull();
  expect(button("Fire")).toBeSelected();
  expect(button("Fire")).toHaveStyle({ borderColor: color.text });
  expect(button("Clap")).not.toBeSelected();
  // The words of the line are gone while one chooses.
  expect(screen.queryByRole("button", { name: "Reply" })).toBeNull();

  await fireEvent.press(button("Clap"));
  expect(onReact).toHaveBeenCalledWith("clap");
  expect(button("Reply")).toBeOnTheScreen();
});

test("one's own chosen again is asked for too: the comments take it away", async () => {
  await line(MINE);
  await fireEvent.press(button("Your reaction: Fire"));
  await fireEvent.press(button("Fire"));
  expect(onReact).toHaveBeenCalledWith("fire");
});

test("«Cancel» goes back and leaves nothing", async () => {
  await line(OTHERS);
  await fireEvent.press(button("React"));
  await fireEvent.press(button("Cancel"));
  expect(onReact).not.toHaveBeenCalled();
  expect(button("Reply")).toBeOnTheScreen();
});

test("the line is as tall choosing as not, and every touch reaches a button's height", async () => {
  await line(MINE);
  for (const one of screen.getAllByRole("button")) {
    const { top, bottom } = one.props.hitSlop;
    expect(COMMENT_ACTIONS_HEIGHT + top + bottom).toBeGreaterThanOrEqual(MIN_TAP_SIZE);
  }
  await fireEvent.press(button("Your reaction: Fire"));
  expect(screen.getByTestId("c-choices")).toHaveStyle({
    height: COMMENT_ACTIONS_HEIGHT,
  });
  for (const one of screen.getAllByRole("button")) {
    const { top, bottom } = one.props.hitSlop;
    expect(COMMENT_ACTIONS_HEIGHT + top + bottom).toBeGreaterThanOrEqual(MIN_TAP_SIZE);
  }
});
