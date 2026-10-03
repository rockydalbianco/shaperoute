import comment from "@shaperoute/shared-types/fixtures/comment.json";
import request from "@shaperoute/shared-types/fixtures/comment-request.json";
import comments from "@shaperoute/shared-types/fixtures/comments.json";
import { COMMENT_MAX_LENGTH } from "@shaperoute/shared-types";

import { answers, apiError } from "../account/testing";
import {
  commentOf,
  commentProblem,
  commentTextProblem,
  deleteComment,
  fetchComments,
  isComment,
  isCommentsPage,
  postComment,
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
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`http://api/drawings/${DRAWING}/comments`);
  expect(init).toMatchObject({ method: "GET", headers: AUTH });
  expect(fetchFn.mock.calls[1][0]).toBe(
    `http://api/drawings/${DRAWING}/comments?cursor=${comments.next}`,
  );
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
