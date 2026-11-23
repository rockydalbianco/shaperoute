import request from "@shaperoute/shared-types/fixtures/sleep-post-request.json";
import post from "@shaperoute/shared-types/fixtures/sleep-post.json";
import noStages from "@shaperoute/shared-types/fixtures/sleep-summary-no-stages.json";
import summary from "@shaperoute/shared-types/fixtures/sleep-summary.json";

import { answers, apiError } from "../account/testing";
import {
  fetchSleepPost,
  isMySleepPost,
  publishSleepPost,
  removeSleepPost,
} from "./sleepPosts";

// The post of a night on the API (TASK-467 part E): the same JSON as the
// API's test_sleep_posts.py.

const API = "http://api";
const replies = (...list: Parameters<typeof answers>) =>
  answers(...list) as unknown as typeof fetch & jest.Mock;

function sent(fetchFn: jest.Mock): { url: string; method: string; body: unknown } {
  const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
  return {
    url,
    method: String(init.method),
    body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
  };
}

test("the examples are the bodies", () => {
  expect(isMySleepPost(post)).toBe(true);
  // A night as others read it is no post of its owner.
  expect(isMySleepPost(summary)).toBe(false);
  expect(isMySleepPost({ ...post, visibility: "only_me" })).toBe(false);
  expect(isMySleepPost({ ...post, id: "" })).toBe(false);
  expect(isMySleepPost({ ...post, published_at: null })).toBe(false);
  expect(isMySleepPost({ ...post, score: 101 })).toBe(false);
});

test("«Publish» sends the figures of the night and who sees it, nothing else", async () => {
  const fetchFn = replies({ status: 200, body: post });
  const outcome = await publishSleepPost(API, "t", summary, "everyone", {
    fetchFn,
    key: null,
  });
  expect(outcome).toEqual({ kind: "ok", value: post });
  expect(sent(fetchFn)).toEqual({
    url: `${API}/me/sleep-posts/2026-09-21`,
    method: "PUT",
    body: request,
  });
  expect(Object.keys(sent(fetchFn).body as object).sort()).toEqual([
    "asleep_min",
    "awake_min",
    "score",
    "stages",
    "visibility",
  ]);
});

test("a night no watch told the stages of is published without them", async () => {
  const fetchFn = replies({
    status: 200,
    body: {
      ...noStages,
      id: post.id,
      visibility: "followers",
      published_at: post.published_at,
    },
  });
  const outcome = await publishSleepPost(API, "t", noStages, "followers", {
    fetchFn,
    key: null,
  });
  expect(outcome.kind).toBe("ok");
  expect(sent(fetchFn).body).toEqual({
    score: noStages.score,
    asleep_min: noStages.asleep_min,
    awake_min: noStages.awake_min,
    visibility: "followers",
  });
});

test("the post of a night, or none", async () => {
  const fetchFn = replies(
    { status: 200, body: post },
    { status: 404, body: apiError("http_error") },
  );
  expect(await fetchSleepPost(API, "t", "2026-09-21", { fetchFn, key: null })).toEqual({
    kind: "ok",
    value: post,
  });
  expect(sent(fetchFn)).toEqual({
    url: `${API}/me/sleep-posts/2026-09-21`,
    method: "GET",
    body: undefined,
  });
  const none = await fetchSleepPost(API, "t", "2026-09-22", { fetchFn, key: null });
  expect(none.kind).toBe("api_error");
});

test("«Remove post» takes it off the Feed", async () => {
  const fetchFn = replies({ status: 204 });
  expect(await removeSleepPost(API, "t", "2026-09-21", { fetchFn, key: null })).toEqual(
    {
      kind: "ok",
      value: null,
    },
  );
  expect(sent(fetchFn)).toEqual({
    url: `${API}/me/sleep-posts/2026-09-21`,
    method: "DELETE",
    body: undefined,
  });
});
