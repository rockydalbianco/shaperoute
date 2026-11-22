/**
 * A gym plan as a post (TASK-485 part B, ADR-0394): the calls of
 * docs/API.md «Plan posts», and «Post» kept on the phone until the API has
 * it, so that a plan is posted without a network too, with the phone's key.
 */
import myPost from "@shaperoute/shared-types/fixtures/my-plan-post.json";
import request from "@shaperoute/shared-types/fixtures/plan-post-request.json";
import type { MyPlanPost, PlanPostRequest } from "@shaperoute/shared-types";

import { answers, apiError } from "../account/testing";
import {
  fetchMyPlanPost,
  forgetPlanPostsOf,
  isGymPlanPosted,
  isMyPlanPost,
  keepPlanPost,
  keepPlanPostDeleted,
  loadPlanPosts,
  MAX_PLAN_POSTS_WAITING,
  planPostKeyOf,
  removePlanPost,
  savePlanPost,
  sendWaitingPlanPosts,
} from "./planPosts";

jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const URL = "http://api";
const TOKEN = "the-token";
const OWNER = 7;
const KEY = "pp7k2m9q4x1c";
const REQUEST = request as PlanPostRequest;
const POST = myPost as MyPlanPost;
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });
const via = (fetchFn: jest.Mock) => ({ fetchFn: fetchFn as unknown as typeof fetch });

beforeEach(() => {
  files.clear();
});

test("the API's examples are what the app reads and sends", () => {
  expect(isMyPlanPost(POST)).toBe(true);
  expect(isGymPlanPosted(REQUEST.plan)).toBe(true);
  // A plan without weeks too.
  expect(isGymPlanPosted({ name: "Push", days: [1, 4], items: [] })).toBe(true);
  const program = REQUEST.plan.program!;
  // Never its owner's first day, paces or target day.
  for (const broken of [
    { ...program, starts_on: "2026-11-23" },
    { ...program, runner: { pace_10k_s: 3000 } },
    { ...program, target: { sport: "run", distance_m: 10000, on: "2027-04-01" } },
    { ...program, mode: "random" },
    { ...program, sessions: [{ day: 8, name: "A", items: [] }] },
  ]) {
    expect(isGymPlanPosted({ ...REQUEST.plan, program: broken })).toBe(false);
  }
  expect(isMyPlanPost({ ...POST, visibility: "only_me" })).toBe(false);
});

test("it posts, reads and deletes a plan by the phone's key", async () => {
  const saving = answers({ status: 200, body: POST });
  expect(await savePlanPost(URL, TOKEN, KEY, REQUEST, options(saving))).toEqual({
    kind: "ok",
    value: POST,
  });
  const [url, init] = saving.mock.calls[0];
  expect(String(url)).toBe(`${URL}/me/plan-posts/${KEY}`);
  expect(init?.method).toBe("PUT");
  expect(JSON.parse(String(init?.body))).toEqual(REQUEST);

  const reading = answers({ status: 200, body: POST });
  expect((await fetchMyPlanPost(URL, TOKEN, KEY, options(reading))).kind).toBe("ok");
  expect(reading.mock.calls[0][1]?.method).toBe("GET");

  const dropping = answers({ status: 204 });
  expect(await removePlanPost(URL, TOKEN, KEY, options(dropping))).toEqual({
    kind: "ok",
    value: null,
  });
  expect(dropping.mock.calls[0][1]?.method).toBe("DELETE");
});

test("«Post» without a network waits on the phone and goes later, once", async () => {
  expect(keepPlanPost(OWNER, KEY, REQUEST, 1000)).toBe("kept");
  const offline = answers(new TypeError("Network request failed"));
  expect(await sendWaitingPlanPosts(URL, TOKEN, OWNER, via(offline))).toEqual({
    sent: false,
    stopped: true,
  });
  expect(loadPlanPosts()).toMatchObject([{ key: KEY, state: "waiting" }]);

  const online = answers({ status: 200, body: POST });
  expect(await sendWaitingPlanPosts(URL, TOKEN, OWNER, via(online))).toEqual({
    sent: true,
    stopped: false,
  });
  expect(String(online.mock.calls[0][0])).toBe(`${URL}/me/plan-posts/${KEY}`);
  expect(loadPlanPosts()).toMatchObject([{ key: KEY, state: "sent", id: POST.id }]);
  // On the API: nothing more to send.
  const none = answers();
  await sendWaitingPlanPosts(URL, TOKEN, OWNER, via(none));
  expect(none).not.toHaveBeenCalled();
});

test("one's own post is found by its id and deleted, here then on the API", async () => {
  keepPlanPost(OWNER, KEY, REQUEST, 1000);
  await sendWaitingPlanPosts(
    URL,
    TOKEN,
    OWNER,
    via(answers({ status: 200, body: POST })),
  );
  expect(planPostKeyOf(OWNER, POST.id)).toBe(KEY);
  expect(planPostKeyOf(8, POST.id)).toBeNull();

  expect(keepPlanPostDeleted(OWNER, KEY)).toBe(true);
  expect(planPostKeyOf(OWNER, POST.id)).toBeNull();
  const deleting = answers({ status: 204 });
  await sendWaitingPlanPosts(URL, TOKEN, OWNER, via(deleting));
  expect(deleting.mock.calls[0][1]?.method).toBe("DELETE");
  expect(loadPlanPosts()).toEqual([]);
});

test("a post deleted before it went up is just forgotten", () => {
  keepPlanPost(OWNER, KEY, REQUEST, 1000);
  keepPlanPostDeleted(OWNER, KEY);
  expect(loadPlanPosts()).toEqual([]);
});

test("a plan the API refuses stays marked and is not sent again", async () => {
  keepPlanPost(OWNER, KEY, REQUEST, 1000);
  const refusing = answers({ status: 422, body: apiError("invalid_request") });
  await sendWaitingPlanPosts(URL, TOKEN, OWNER, via(refusing));
  expect(loadPlanPosts()).toMatchObject([{ key: KEY, refused: "invalid_request" }]);
  const none = answers();
  await sendWaitingPlanPosts(URL, TOKEN, OWNER, via(none));
  expect(none).not.toHaveBeenCalled();
});

test("a session ended keeps the post for the next sign-in", async () => {
  keepPlanPost(OWNER, KEY, REQUEST, 1000);
  const ended = answers({ status: 401, body: apiError("session_expired") });
  expect(await sendWaitingPlanPosts(URL, TOKEN, OWNER, via(ended))).toEqual({
    sent: false,
    stopped: true,
  });
  expect(loadPlanPosts()).toMatchObject([{ key: KEY, state: "waiting" }]);
  expect(loadPlanPosts()[0].refused).toBeUndefined();
});

test("each account has its own, and at most 20 wait", () => {
  for (let i = 0; i < MAX_PLAN_POSTS_WAITING; i += 1) {
    expect(keepPlanPost(OWNER, `key${String(i).padStart(6, "0")}`, REQUEST, i)).toBe(
      "kept",
    );
  }
  expect(keepPlanPost(OWNER, "onemore000", REQUEST, 99)).toBe("full");
  expect(keepPlanPost(8, "another000", REQUEST, 99)).toBe("kept");
  forgetPlanPostsOf(OWNER);
  expect(loadPlanPosts().map((one) => one.owner)).toEqual([8]);
});
