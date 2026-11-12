import assert from "node:assert/strict";
import { test } from "node:test";

import commentReactionRequest from "../fixtures/comment-reaction-request.json" with { type: "json" };
import commentReactions from "../fixtures/comment-reactions.json" with { type: "json" };
import commentReplyRequest from "../fixtures/comment-reply-request.json" with { type: "json" };
import commentReply from "../fixtures/comment-reply.json" with { type: "json" };
import commentThreads from "../fixtures/comment-threads.json" with { type: "json" };
import comment from "../fixtures/comment.json" with { type: "json" };
import {
  COMMENT_REACTION_KINDS,
  COMMENT_REPLIES_SHOWN,
  type Comment,
  type CommentReactionRequest,
  type CommentReactions,
  type CommentRequest,
  type CommentsPage,
  REACTION_KINDS,
} from "../src/index.ts";

// The same JSON is validated by the API's test_comment_threads.py
// (TASK-454 part C1, ADR-0377).
const asked: CommentRequest = commentReplyRequest;
const reply = commentReply as Comment;
const page = commentThreads as CommentsPage;
const reactions = commentReactions as CommentReactions;
const reacting = commentReactionRequest as CommentReactionRequest;
// A comment from before the replies is still a comment.
const before: Comment = comment;

test("a comment takes the reactions of a drawing but the MuW heart", () => {
  assert.deepEqual(
    [...COMMENT_REACTION_KINDS],
    REACTION_KINDS.filter((kind) => kind !== "super_like"),
  );
  assert.ok(COMMENT_REACTION_KINDS.includes(reacting.kind));
  assert.deepEqual(Object.keys(reactions.counts), [...COMMENT_REACTION_KINDS]);
  assert.equal(
    reactions.total,
    Object.values(reactions.counts).reduce((sum, n) => sum + n, 0),
  );
});

test("a reply stands under a comment and may name who it answers", () => {
  assert.ok(asked.reply_to);
  assert.equal(typeof reply.parent_id, "string");
  assert.ok(reply.mention);
  assert.equal(reply.reply_count, 0);
  assert.equal(reply.replies, null);
});

test("the threads carry the first replies of each comment", () => {
  const [top] = page.comments;
  assert.ok(top);
  assert.equal(top.parent_id, null);
  assert.equal(top.replies?.length, COMMENT_REPLIES_SHOWN);
  assert.ok((top.reply_count ?? 0) > COMMENT_REPLIES_SHOWN);
  for (const below of top.replies ?? []) {
    assert.equal(below.parent_id, top.id);
  }
  // Comments and replies, on every page.
  assert.equal(page.total, 1 + (top.reply_count ?? 0));
});

test("a comment from before the replies has none of the new fields", () => {
  assert.equal(before.parent_id, undefined);
  assert.equal(before.replies, undefined);
  assert.equal(before.reactions, undefined);
});
