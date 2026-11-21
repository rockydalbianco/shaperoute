import comment from "@shaperoute/shared-types/fixtures/comment.json";
import reactionRequest from "@shaperoute/shared-types/fixtures/comment-reaction-request.json";
import reactions from "@shaperoute/shared-types/fixtures/comment-reactions.json";
import reply from "@shaperoute/shared-types/fixtures/comment-reply.json";
import replyRequest from "@shaperoute/shared-types/fixtures/comment-reply-request.json";
import request from "@shaperoute/shared-types/fixtures/comment-request.json";
import threads from "@shaperoute/shared-types/fixtures/comment-threads.json";
import comments from "@shaperoute/shared-types/fixtures/comments.json";
import { COMMENT_MAX_LENGTH } from "@shaperoute/shared-types";

import { answers, apiError } from "../account/testing";
import {
  commentOf,
  commentProblem,
  commentTextProblem,
  deleteComment,
  deleteCommentReaction,
  fetchComments,
  fetchReplies,
  isComment,
  isCommentReactions,
  isCommentsPage,
  postComment,
  putCommentReaction,
} from "./comments";

const URL = "http://api";
const TOKEN = "the-token";
const DRAWING = "3f9d2c71-8a4b-4e06-b5d1-c27e9a40f815";
const AUTH = { Authorization: `Bearer ${TOKEN}` };
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });

test("the examples of the API are what the app reads", () => {
  expect(isComment(comment)).toBe(true);
  expect(isComment({ ...comment, deletable: "yes" })).toBe(false);
  expect(isComment({ ...comment, author: null })).toBe(false);
  expect(isCommentsPage(comments)).toBe(true);
  expect(isCommentsPage({ ...comments, next: null })).toBe(true);
  expect(isCommentsPage({ ...comments, comments: [{}] })).toBe(false);
  expect(Object.keys(request)).toEqual(["text"]);
});

test("a comment loses the spaces around it; empty or too long cannot go", () => {
  expect(commentOf("  Nice heart!\n")).toBe("Nice heart!");
  expect(commentTextProblem("Nice")).toBeNull();
  expect(commentTextProblem("  \n ")).toBe("A comment needs some words.");
  expect(commentTextProblem("x".repeat(COMMENT_MAX_LENGTH))).toBeNull();
  expect(commentTextProblem("x".repeat(COMMENT_MAX_LENGTH + 1))).toBe(
    "A comment is at most 500 characters.",
  );
  // An emoji is one character, as the API counts it.
  expect(commentTextProblem("🏃".repeat(COMMENT_MAX_LENGTH))).toBeNull();
});

test("a page of comments is asked with the token, then after the cursor", async () => {
  const fetchFn = answers(
    { status: 200, body: comments },
    { status: 200, body: { ...comments, next: null } },
  );
  const first = await fetchComments(URL, TOKEN, DRAWING, null, options(fetchFn));
  expect(first).toEqual({ kind: "ok", value: comments });
  await fetchComments(URL, TOKEN, DRAWING, comments.next, options(fetchFn));
  // With the replies under their comments (TASK-454): an API from before
  // them does not know `threads` and answers the list it always did.
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`http://api/drawings/${DRAWING}/comments?threads=true`);
  expect(init).toMatchObject({ method: "GET", headers: AUTH });
  expect(fetchFn.mock.calls[1][0]).toBe(
    `http://api/drawings/${DRAWING}/comments?threads=true&cursor=${comments.next}`,
  );
});

describe("replies and reactions to a comment (TASK-454 part C, ADR-0377)", () => {
  const [top] = threads.comments;

  test("the examples of the API are what the app reads", () => {
    expect(isCommentsPage(threads)).toBe(true);
    expect(isComment(reply)).toBe(true);
    expect(isCommentReactions(reactions)).toBe(true);
    // A comment of before the replies is still one: its example has none of it.
    expect(isComment(comment)).toBe(true);
    // Never half made: a reply that is not a comment, a kind that is not one.
    expect(isComment({ ...top, replies: [{}] })).toBe(false);
    expect(isComment({ ...top, mention: { username: "ada" } })).toBe(false);
    expect(isComment({ ...top, reply_count: "3" })).toBe(false);
    expect(isComment({ ...top, reactions: { ...reactions, mine: "super_like" } })).toBe(
      false,
    );
    expect(
      isCommentReactions({ ...reactions, counts: { ...reactions.counts, wow: null } }),
    ).toBe(false);
  });

  test("a reply goes with the id of what it answers", async () => {
    const fetchFn = answers({ status: 201, body: reply });
    const outcome = await postComment(
      URL,
      TOKEN,
      DRAWING,
      ` ${replyRequest.text} `,
      options(fetchFn),
      replyRequest.reply_to,
    );
    expect(outcome).toEqual({ kind: "ok", value: reply });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`http://api/drawings/${DRAWING}/comments`);
    expect(JSON.parse(String(init?.body))).toEqual(replyRequest);
  });

  test("the other replies of a comment are asked by its id, then after the cursor", async () => {
    const page = { comments: top.replies, next: "n2", total: 3 };
    const fetchFn = answers({ status: 200, body: page }, { status: 200, body: page });
    const first = await fetchReplies(URL, TOKEN, top.id, null, options(fetchFn));
    expect(first).toEqual({ kind: "ok", value: page });
    await fetchReplies(URL, TOKEN, top.id, "n2", options(fetchFn));
    expect(fetchFn.mock.calls[0][0]).toBe(`http://api/comments/${top.id}/replies`);
    expect(fetchFn.mock.calls[0][1]).toMatchObject({ method: "GET", headers: AUTH });
    expect(fetchFn.mock.calls[1][0]).toBe(
      `http://api/comments/${top.id}/replies?cursor=n2`,
    );
  });

  test("a reaction is left with PUT and taken away with DELETE", async () => {
    const fetchFn = answers(
      { status: 200, body: reactions },
      { status: 200, body: reactions },
    );
    const left = await putCommentReaction(URL, TOKEN, top.id, "fire", options(fetchFn));
    expect(left).toEqual({ kind: "ok", value: reactions });
    await deleteCommentReaction(URL, TOKEN, top.id, options(fetchFn));
    const [putUrl, put] = fetchFn.mock.calls[0];
    expect(putUrl).toBe(`http://api/comments/${top.id}/reaction`);
    expect(put).toMatchObject({ method: "PUT", headers: AUTH });
    expect(JSON.parse(String(put?.body))).toEqual(reactionRequest);
    const [deleteUrl, del] = fetchFn.mock.calls[1];
    expect(deleteUrl).toBe(`http://api/comments/${top.id}/reaction`);
    expect(del).toMatchObject({ method: "DELETE", headers: AUTH });
  });
});

test("a comment goes without the spaces around it", async () => {
  const fetchFn = answers({ status: 201, body: comment });
  const outcome = await postComment(
    URL,
    TOKEN,
    DRAWING,
    `  ${request.text}  `,
    options(fetchFn),
  );
  expect(outcome).toEqual({ kind: "ok", value: comment });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`http://api/drawings/${DRAWING}/comments`);
  expect(init).toMatchObject({ method: "POST", headers: AUTH });
  expect(JSON.parse(String(init?.body))).toEqual(request);
});

test("a comment is deleted by its id, and the API answers without a body", async () => {
  const fetchFn = answers({ status: 204 });
  const outcome = await deleteComment(URL, TOKEN, comment.id, options(fetchFn));
  expect(outcome).toEqual({ kind: "ok", value: null });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`http://api/comments/${comment.id}`);
  expect(init).toMatchObject({ method: "DELETE", headers: AUTH });
});

test("what did not go is said in words", async () => {
  const say = async (answer: Parameters<typeof answers>[0]) =>
    commentProblem(
      await postComment(URL, TOKEN, DRAWING, "Hi", options(answers(answer))),
    );
  expect(
    await say({
      status: 429,
      body: apiError("too_many_requests", "Too many comments in a minute."),
      headers: { "Retry-After": "40" },
    }),
  ).toBe("Too many comments in a minute. Wait a moment and try again.");
  expect(
    await say({
      status: 422,
      body: { error: { ...apiError("comment_rejected").error, reason: "negative" } },
    }),
  ).toBe("You can't write negative comments in this app. Try another app.");
  expect(
    await say({
      status: 422,
      body: apiError("invalid_request", "A comment needs some words."),
    }),
  ).toBe("A comment needs some words.");
  expect(await say({ status: 404, body: apiError("http_error") })).toBe(
    "The comments of this drawing are not available.",
  );
  expect(await say({ status: 401, body: apiError("session_expired") })).toBe(
    "Your session has ended. Log in again.",
  );
  expect(await say(new TypeError("Network request failed"))).toBe(
    "No connection. Try again when you are online.",
  );
  expect(commentProblem({ kind: "ok", value: null })).toBeNull();
});
