import threads from "@shaperoute/shared-types/fixtures/comment-threads.json";
import type { Comment, CommentReactions, CommentsPage } from "@shaperoute/shared-types";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { AccountOutcome } from "../api/accounts";
import { CommentsContext, type CommentsDoor } from "./commentsDoor";
import {
  hiddenReplies,
  NO_COMMENT_REACTIONS,
  shownReplies,
  withMyReaction,
} from "./commentThreads";
import { useDrawingComments } from "./useDrawingComments";

// The comments of a drawing with their replies and reactions (TASK-454
// part C, ADR-0377), as the sheet is handed them.

const DRAWING = "3f9d2c71-8a4b-4e06-b5d1-c27e9a40f815";
const PAGE = threads as CommentsPage;
/** A comment with three replies, two of them here; fire 3, wow 1, mine: fire. */
const [TOP] = PAGE.comments;
const [FIRST, SECOND] = shownReplies(TOP);
const THIRD: Comment = {
  ...FIRST,
  id: "third",
  text: "And the third",
  created_at: "2026-10-03T09:30:00Z",
};
const OFFLINE = { kind: "unreachable", url: "http://api" } as const;

function ok<T>(value: T): AccountOutcome<T> {
  return { kind: "ok", value };
}

type Answers = {
  written?: AccountOutcome<Comment>[];
  replies?: AccountOutcome<CommentsPage>[];
  reacted?: (AccountOutcome<CommentReactions> | null)[];
};

function door({ written = [], replies = [], reacted = [] }: Answers = {}) {
  return {
    pageOf: jest.fn(async () => ok(PAGE)),
    write: jest.fn(async () => written.shift() ?? null),
    remove: jest.fn(async () => ok(null)),
    photoOf: jest.fn(async () => null),
    threads: {
      repliesOf: jest.fn(async () => replies.shift() ?? null),
      react: jest.fn(async () => reacted.shift() ?? null),
    },
  } satisfies CommentsDoor;
}

/** The comments read through `value`, ready. */
async function read(value: CommentsDoor) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CommentsContext.Provider value={value}>{children}</CommentsContext.Provider>
  );
  const hook = await renderHook(() => useDrawingComments(DRAWING), { wrapper });
  await waitFor(() => expect(hook.result.current.status).toBe("ready"));
  return hook.result;
}

test("the comments come with their first replies; the total counts them all", async () => {
  const result = await read(door());
  expect(result.current.threads).toBe(true);
  expect(result.current.total).toBe(4);
  expect(result.current.comments).toHaveLength(1);
  expect(hiddenReplies(result.current.comments[0])).toBe(1);
});

test("a door without the replies offers none of it", async () => {
  const { threads: _, ...before } = door();
  const result = await read(before);
  expect(result.current.threads).toBe(false);
  // Asked for all the same, nothing happens.
  await act(async () => {
    result.current.showReplies(TOP.id);
    result.current.react(TOP, "wow");
  });
  expect(result.current.comments).toEqual(PAGE.comments);
  expect(result.current.sendProblem).toBeNull();
});

test("a reply goes with the id of what it answers, and under its comment", async () => {
  const mine: Comment = {
    ...SECOND,
    id: "mine",
    text: "Me too",
    created_at: "2026-10-03T10:00:00Z",
  };
  const value = door({ written: [ok(mine)] });
  const result = await read(value);
  let sent = "";
  await act(async () => {
    // A reply to a reply: the API puts it under the same comment.
    sent = await result.current.send("Me too", SECOND);
  });
  expect(sent).toBe("sent");
  expect(value.write).toHaveBeenCalledWith(DRAWING, "Me too", SECOND.id);
  const [top] = result.current.comments;
  expect(shownReplies(top).map((reply) => reply.id)).toEqual([
    FIRST.id,
    SECOND.id,
    "mine",
  ]);
  expect(hiddenReplies(top)).toBe(1);
  expect(result.current.total).toBe(5);
  expect(result.current.comments).toHaveLength(1);
});

test("a comment is written as before: no id of another", async () => {
  const mine: Comment = {
    ...TOP,
    id: "mine",
    reply_count: 0,
    replies: null,
    reactions: NO_COMMENT_REACTIONS,
  };
  const value = door({ written: [ok(mine)] });
  const result = await read(value);
  await act(async () => {
    await result.current.send("A new one");
  });
  expect(value.write).toHaveBeenCalledWith(DRAWING, "A new one");
  expect(result.current.comments.map((comment) => comment.id)).toEqual([
    TOP.id,
    "mine",
  ]);
});

test("«View more replies» asks the first page, then goes on from its cursor", async () => {
  const value = door({
    replies: [
      ok({ comments: [FIRST, SECOND], next: "n2", total: 3 }),
      ok({ comments: [THIRD], next: null, total: 3 }),
    ],
  });
  const result = await read(value);
  await act(async () => result.current.showReplies(TOP.id));
  expect(value.threads.repliesOf).toHaveBeenLastCalledWith(TOP.id, null);
  // The ones that came with the comment, once.
  expect(shownReplies(result.current.comments[0])).toHaveLength(2);
  expect(hiddenReplies(result.current.comments[0])).toBe(1);

  await act(async () => result.current.showReplies(TOP.id));
  expect(value.threads.repliesOf).toHaveBeenLastCalledWith(TOP.id, "n2");
  expect(shownReplies(result.current.comments[0]).map((reply) => reply.id)).toEqual([
    FIRST.id,
    SECOND.id,
    "third",
  ]);
  expect(hiddenReplies(result.current.comments[0])).toBe(0);
});

test("the list asked again starts the replies from the beginning", async () => {
  const value = door({
    replies: [
      ok({ comments: [FIRST, SECOND], next: "n2", total: 3 }),
      ok({ comments: [FIRST, SECOND], next: "n2", total: 3 }),
    ],
  });
  const result = await read(value);
  await act(async () => result.current.showReplies(TOP.id));
  await act(async () => result.current.reload());
  await waitFor(() => expect(result.current.status).toBe("ready"));
  await act(async () => result.current.showReplies(TOP.id));
  expect(value.threads.repliesOf).toHaveBeenLastCalledWith(TOP.id, null);
});

test("a reaction shows at once, and what the API counts stays", async () => {
  const counted: CommentReactions = {
    ...withMyReaction(SECOND.reactions ?? NO_COMMENT_REACTIONS, "laugh"),
    total: 9,
  };
  let answer: (outcome: AccountOutcome<CommentReactions>) => void = () => {};
  const value = door();
  value.threads.react = jest.fn(
    () =>
      new Promise<AccountOutcome<CommentReactions>>((resolve) => {
        answer = resolve;
      }),
  );
  const result = await read(value);
  const second = () => shownReplies(result.current.comments[0])[1].reactions;

  await act(async () => result.current.react(SECOND, "laugh"));
  expect(value.threads.react).toHaveBeenCalledWith(SECOND.id, "laugh");
  expect(second()).toMatchObject({ mine: "laugh", total: 3 });
  // One at a time: the next waits for the answer to this one.
  await act(async () => result.current.react(TOP, "wow"));
  expect(value.threads.react).toHaveBeenCalledTimes(1);

  await act(async () => answer(ok(counted)));
  expect(second()).toEqual(counted);
});

test("one's own again takes it away", async () => {
  const none = withMyReaction(TOP.reactions ?? NO_COMMENT_REACTIONS, null);
  const value = door({ reacted: [ok(none)] });
  const result = await read(value);
  await act(async () => result.current.react(TOP, "fire"));
  expect(value.threads.react).toHaveBeenCalledWith(TOP.id, null);
  expect(result.current.comments[0].reactions).toEqual(none);
});

test("a reaction the API did not keep comes back as it was, with a notice", async () => {
  const result = await read(door({ reacted: [OFFLINE] }));
  await act(async () => result.current.react(TOP, "wow"));
  expect(result.current.comments[0].reactions).toEqual(TOP.reactions);
  expect(result.current.sendProblem).toBe(
    "Your reaction wasn't saved. Check the connection.",
  );
});

test("a comment deleted takes its replies out of the count; a reply only itself", async () => {
  const value = door();
  const result = await read(value);
  await act(async () => result.current.remove(FIRST.id));
  expect(result.current.total).toBe(3);
  expect(shownReplies(result.current.comments[0]).map((reply) => reply.id)).toEqual([
    SECOND.id,
  ]);
  // The comment, with the two replies it has left.
  await act(async () => result.current.remove(TOP.id));
  expect(result.current.comments).toEqual([]);
  expect(result.current.total).toBe(0);
});
