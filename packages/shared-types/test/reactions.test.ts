import assert from "node:assert/strict";
import { test } from "node:test";

import comment from "../fixtures/comment.json" with { type: "json" };
import reactionRequest from "../fixtures/reaction-request.json" with { type: "json" };
import reactionResult from "../fixtures/reaction-result.json" with { type: "json" };
import reactions from "../fixtures/reactions.json" with { type: "json" };
import superLikeRequest from "../fixtures/super-like-request.json" with { type: "json" };
import {
  COMMENT_MAX_LENGTH,
  REACTION_KINDS,
  type ReactionKind,
  type ReactionRequest,
  type ReactionResult,
  type ReactionsSummary,
  SUPER_LIKE_MIN_COMMENT,
} from "../src/index.ts";

// The same JSON is validated by the API's test_reactions.py (TASK-119).
const asked = reactionRequest as ReactionRequest;
const superLike = superLikeRequest as ReactionRequest;
const summary = reactions as ReactionsSummary;
const result = reactionResult as ReactionResult;

function isKind(value: unknown): value is ReactionKind {
  return (REACTION_KINDS as readonly unknown[]).includes(value);
}

test("the six kinds, the Sgrava heart first", () => {
  assert.deepEqual(REACTION_KINDS, [
    "super_like",
    "fire",
    "clap",
    "strong",
    "laugh",
    "wow",
  ]);
});

test("an emoji comes without a comment", () => {
  assert.deepEqual(Object.keys(asked), ["kind"]);
  assert.ok(isKind(asked.kind) && asked.kind !== "super_like");
});

test("a super like comes with a comment within the limits", () => {
  assert.equal(superLike.kind, "super_like");
  const words = (superLike.comment ?? "").trim();
  assert.ok([...words].length >= SUPER_LIKE_MIN_COMMENT);
  assert.ok([...words].length <= COMMENT_MAX_LENGTH);
});

test("the counts hold all six kinds, in order, and add up", () => {
  for (const seen of [summary, result.reactions]) {
    assert.deepEqual(Object.keys(seen.counts), [...REACTION_KINDS]);
    const sum = Object.values(seen.counts).reduce((a, b) => a + b, 0);
    assert.equal(seen.total, sum);
    assert.ok(seen.mine === null || isKind(seen.mine));
    assert.ok(seen.mine === null || seen.counts[seen.mine] > 0);
  }
});

test("a super like just left brings its comment, as a comment", () => {
  assert.equal(result.reactions.mine, "super_like");
  assert.ok(result.comment !== null);
  assert.deepEqual(Object.keys(result.comment).sort(), Object.keys(comment).sort());
  assert.equal(result.comment.text, superLike.comment);
  assert.equal(result.comment.deletable, true);
});
