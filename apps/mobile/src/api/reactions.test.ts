import request from "@shaperoute/shared-types/fixtures/reaction-request.json";
import result from "@shaperoute/shared-types/fixtures/reaction-result.json";
import reactions from "@shaperoute/shared-types/fixtures/reactions.json";
import superLike from "@shaperoute/shared-types/fixtures/super-like-request.json";
import { COMMENT_MAX_LENGTH } from "@shaperoute/shared-types";

import { answers, apiError } from "../account/testing";
import {
  deleteReaction,
  fetchReactions,
  isReactionResult,
  isReactionsSummary,
  putReaction,
  superLikeTextProblem,
} from "./reactions";

const URL = "http://api";
const TOKEN = "the-token";
const DRAWING = "3f9d2c71-8a4b-4e06-b5d1-c27e9a40f815";
const AUTH = { Authorization: `Bearer ${TOKEN}` };
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });

test("the examples of the API are what the app reads", () => {
  expect(isReactionsSummary(reactions)).toBe(true);
  expect(isReactionsSummary({ ...reactions, mine: null })).toBe(true);
  expect(isReactionsSummary({ ...reactions, mine: "heart" })).toBe(false);
  expect(isReactionsSummary({ ...reactions, counts: { fire: 1 } })).toBe(false);
  expect(isReactionsSummary({ ...reactions, total: "7" })).toBe(false);
  expect(isReactionResult(result)).toBe(true);
  expect(isReactionResult({ ...result, comment: null })).toBe(true);
  expect(isReactionResult({ ...result, comment: {} })).toBe(false);
  expect(isReactionResult(reactions)).toBe(false);
});

test("a super like needs two characters once the spaces around are gone", () => {
  expect(superLikeTextProblem("")).toBe("At least 2 characters");
  expect(superLikeTextProblem(" a \n")).toBe("At least 2 characters");
  expect(superLikeTextProblem("ok")).toBeNull();
  // An emoji is one character, as the API counts it.
  expect(superLikeTextProblem("🔥")).toBe("At least 2 characters");
  expect(superLikeTextProblem("🔥🔥")).toBeNull();
  expect(superLikeTextProblem("x".repeat(COMMENT_MAX_LENGTH + 1))).toBe(
    "A comment is at most 500 characters.",
  );
});

test("the reactions of a drawing are asked with the token", async () => {
  const fetchFn = answers({ status: 200, body: reactions });
  const outcome = await fetchReactions(URL, TOKEN, DRAWING, options(fetchFn));
  expect(outcome).toEqual({ kind: "ok", value: reactions });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`http://api/drawings/${DRAWING}/reactions`);
  expect(init).toMatchObject({ method: "GET", headers: AUTH });
});

test("an emoji goes alone, as the API's example", async () => {
  const fetchFn = answers({ status: 200, body: { ...result, comment: null } });
  const outcome = await putReaction(
    URL,
    TOKEN,
    DRAWING,
    "fire",
    null,
    options(fetchFn),
  );
  expect(outcome.kind).toBe("ok");
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`http://api/drawings/${DRAWING}/reaction`);
  expect(init).toMatchObject({ method: "PUT", headers: AUTH });
  expect(JSON.parse(String(init?.body))).toEqual(request);
});

test("a super like goes with its comment, without the spaces around", async () => {
  const fetchFn = answers({ status: 200, body: result });
  const outcome = await putReaction(
    URL,
    TOKEN,
    DRAWING,
    "super_like",
    `  ${superLike.comment}\n`,
    options(fetchFn),
  );
  expect(outcome).toEqual({ kind: "ok", value: result });
  expect(JSON.parse(String(fetchFn.mock.calls[0][1]?.body))).toEqual(superLike);
});

test("taking one's own away answers with what is left", async () => {
  const left = { ...reactions, mine: null, total: 6 };
  const fetchFn = answers({ status: 200, body: left });
  const outcome = await deleteReaction(URL, TOKEN, DRAWING, options(fetchFn));
  expect(outcome).toEqual({ kind: "ok", value: left });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`http://api/drawings/${DRAWING}/reaction`);
  expect(init).toMatchObject({ method: "DELETE", headers: AUTH });
  expect(init?.body).toBeUndefined();
});

test("a refusal, no connection and an answer that is not one are told apart", async () => {
  const fetchFn = answers(
    { status: 422, body: apiError("comment_rejected") },
    new Error("offline"),
    { status: 200, body: { reactions: "many" } },
    { status: 404, body: apiError("http_error") },
  );
  const put = () =>
    putReaction(URL, TOKEN, DRAWING, "super_like", "Hi", options(fetchFn));
  expect(await put()).toMatchObject({ kind: "api_error", code: "comment_rejected" });
  expect(await put()).toEqual({ kind: "unreachable", url: URL });
  expect(await put()).toEqual({ kind: "bad_answer", status: 200 });
  // An API from before reactions, or a drawing no longer seen.
  expect(await fetchReactions(URL, TOKEN, DRAWING, options(fetchFn))).toMatchObject({
    kind: "api_error",
    code: "http_error",
  });
});
