import threads from "@shaperoute/shared-types/fixtures/comment-threads.json";
import flat from "@shaperoute/shared-types/fixtures/comments.json";
import type { Comment, CommentsPage } from "@shaperoute/shared-types";

import {
  findComment,
  hasThreads,
  hiddenReplies,
  NO_COMMENT_REACTIONS,
  replyCount,
  shownReplies,
  topCommentKinds,
  withMoreReplies,
  withMyReaction,
  withoutComment,
  withReactions,
  withReply,
} from "./commentThreads";

// The comments with their replies, as a list (TASK-454 part C, ADR-0377).

/** A comment with three replies, two of them here; fire 3, wow 1, mine: fire. */
const [TOP] = (threads as CommentsPage).comments;
const [FIRST, SECOND] = shownReplies(TOP);
const [BEFORE_REPLIES] = (flat as CommentsPage).comments;
const ALONE: Comment = {
  ...TOP,
  id: "alone",
  reply_count: 0,
  replies: [],
  reactions: NO_COMMENT_REACTIONS,
};
const LIST = [TOP, ALONE];

function reply(id: string, at: string, parent = TOP.id): Comment {
  return { ...FIRST, id, created_at: at, parent_id: parent, mention: null };
}

test("a comment of an API from before the replies offers none of it", () => {
  expect(hasThreads(TOP)).toBe(true);
  expect(hasThreads(BEFORE_REPLIES)).toBe(false);
  expect(shownReplies(BEFORE_REPLIES)).toEqual([]);
  expect(replyCount(BEFORE_REPLIES)).toBe(0);
  expect(hiddenReplies(BEFORE_REPLIES)).toBe(0);
});

test("how many replies are still to ask for", () => {
  expect(replyCount(TOP)).toBe(3);
  expect(hiddenReplies(TOP)).toBe(1);
  expect(hiddenReplies(ALONE)).toBe(0);
  // Never fewer than the ones shown: one written since the count was read.
  expect(replyCount({ ...TOP, reply_count: 1 })).toBe(2);
});

test("a comment or a reply is found wherever it is", () => {
  expect(findComment(LIST, TOP.id)).toBe(TOP);
  expect(findComment(LIST, SECOND.id)).toBe(SECOND);
  expect(findComment(LIST, "gone")).toBeNull();
});

test("a reply written goes under its comment, shown at once", () => {
  const mine = reply("mine", "2026-10-03T10:00:00Z");
  const [top, alone] = withReply(LIST, mine) ?? [];
  expect(shownReplies(top).map((one) => one.id)).toEqual([FIRST.id, SECOND.id, "mine"]);
  expect(replyCount(top)).toBe(4);
  // The one still to ask for is still to ask for.
  expect(hiddenReplies(top)).toBe(1);
  expect(alone).toBe(ALONE);
  // Its comment is not in the list (a page not asked for): nothing to show.
  expect(withReply(LIST, reply("far", "2026-10-03T10:00:00Z", "elsewhere"))).toBeNull();
  expect(withReply(LIST, { ...mine, parent_id: null })).toBeNull();
});

test("more replies come among the ones shown, each once, the oldest first", () => {
  const third = reply("third", "2026-10-03T09:30:00Z");
  const mine = reply("mine", "2026-10-03T10:00:00Z");
  const withMine = withReply(LIST, mine) ?? [];
  // The first page of the replies starts with the ones that came already.
  const [top] = withMoreReplies(withMine, TOP.id, [FIRST, SECOND, third, mine], 4);
  expect(shownReplies(top).map((one) => one.id)).toEqual([
    FIRST.id,
    SECOND.id,
    "third",
    "mine",
  ]);
  expect(hiddenReplies(top)).toBe(0);
  // One deleted meanwhile: the API's count is what stays.
  const [fewer] = withMoreReplies(LIST, TOP.id, [FIRST, SECOND], 2);
  expect(hiddenReplies(fewer)).toBe(0);
});

test("a comment deleted takes its replies; a reply goes alone", () => {
  const whole = withoutComment(LIST, TOP.id);
  expect(whole.comments).toEqual([ALONE]);
  expect(whole.gone).toBe(4);

  const one = withoutComment(LIST, FIRST.id);
  expect(one.gone).toBe(1);
  expect(shownReplies(one.comments[0]).map((r) => r.id)).toEqual([SECOND.id]);
  expect(replyCount(one.comments[0])).toBe(2);
  expect(hiddenReplies(one.comments[0])).toBe(1);

  expect(withoutComment(LIST, "gone")).toEqual({ comments: LIST, gone: 0 });
});

test("one's own reaction in place of the one before, at once", () => {
  const reactions = TOP.reactions ?? NO_COMMENT_REACTIONS;
  expect(withMyReaction(reactions, "fire")).toBe(reactions);
  expect(withMyReaction(reactions, "wow")).toEqual({
    counts: { fire: 2, clap: 0, strong: 0, laugh: 0, wow: 2 },
    total: 4,
    mine: "wow",
  });
  expect(withMyReaction(reactions, null)).toEqual({
    counts: { fire: 2, clap: 0, strong: 0, laugh: 0, wow: 1 },
    total: 3,
    mine: null,
  });
  expect(withMyReaction(NO_COMMENT_REACTIONS, "laugh").total).toBe(1);
});

test("the reactions of a comment, or of a reply, change where it is", () => {
  const laughed = withMyReaction(SECOND.reactions ?? NO_COMMENT_REACTIONS, "laugh");
  const [top, alone] = withReactions(LIST, SECOND.id, laughed);
  expect(shownReplies(top)[1].reactions).toEqual(laughed);
  expect(shownReplies(top)[0]).toBe(FIRST);
  expect(top.reactions).toBe(TOP.reactions);
  expect(alone).toBe(ALONE);
  expect(withReactions(LIST, TOP.id, NO_COMMENT_REACTIONS)[0].reactions).toBe(
    NO_COMMENT_REACTIONS,
  );
});

test("the most used first; with as many, the order of the five", () => {
  const counts = { fire: 1, clap: 3, strong: 0, laugh: 1, wow: 3 };
  expect(topCommentKinds(counts, 3)).toEqual(["clap", "wow", "fire"]);
  expect(topCommentKinds(NO_COMMENT_REACTIONS.counts, 3)).toEqual([]);
});
