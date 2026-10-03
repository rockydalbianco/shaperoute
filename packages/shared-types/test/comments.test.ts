import assert from "node:assert/strict";
import { test } from "node:test";

import commentError from "../fixtures/comment-error.json" with { type: "json" };
import commentRequest from "../fixtures/comment-request.json" with { type: "json" };
import comment from "../fixtures/comment.json" with { type: "json" };
import comments from "../fixtures/comments.json" with { type: "json" };
import drawing from "../fixtures/drawing.json" with { type: "json" };
import {
  type ApiError,
  COMMENT_MAX_LENGTH,
  COMMENT_REASONS,
  type Comment,
  type CommentRequest,
  type CommentsPage,
} from "../src/index.ts";

// The same JSON is validated by the API's test_comments.py (TASK-120).
const asked: CommentRequest = commentRequest;
const one: Comment = comment;
const page: CommentsPage = comments;

test("the comment request keeps the API's limits", () => {
  assert.deepEqual(Object.keys(asked), ["text"]);
  assert.ok(asked.text.trim().length > 0);
  assert.ok([...asked.text].length <= COMMENT_MAX_LENGTH);
});

test("a comment names its author by the profile, never the email", () => {
  for (const seen of [one, ...page.comments]) {
    assert.deepEqual(Object.keys(seen.author).sort(), ["public_id", "username"]);
    assert.ok(!Object.keys(seen).includes("email"));
  }
  // The drawing's owner answers under it.
  assert.equal(page.comments[1]?.author.public_id, drawing.author.public_id);
});

test("a page of comments goes from the oldest", () => {
  const times = page.comments.map((c) => Date.parse(c.created_at));
  assert.deepEqual(
    times,
    [...times].sort((a, b) => a - b),
  );
  assert.ok(page.total >= page.comments.length);
  assert.notEqual(page.next, null);
});

test("a negative comment is refused with its reason", () => {
  const refused = commentError as ApiError;
  assert.equal(refused.error.code, "comment_rejected");
  assert.ok((COMMENT_REASONS as readonly unknown[]).includes(refused.error.reason));
});
