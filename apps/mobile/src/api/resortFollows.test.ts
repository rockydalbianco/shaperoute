import feed from "@shaperoute/shared-types/fixtures/feed.json";
import followed from "@shaperoute/shared-types/fixtures/followed-resorts.json";

import { answers } from "../account/testing";
import {
  fetchFollowedResorts,
  fetchResortPosts,
  followResort,
  isResortPostsPage,
} from "./resortFollows";

// «Your resorts» and the posts of a resort (TASK-406 part D3).

const API = "http://api";
const replies = (...list: Parameters<typeof answers>): jest.Mock => answers(...list);
const PAGE = {
  posts: [{ ...feed.posts[0], activity: "skiing" }],
  next: null,
  total: 1,
};

test("a page of a resort's posts is feed posts with a count", () => {
  expect(isResortPostsPage(PAGE)).toBe(true);
  expect(isResortPostsPage({ ...PAGE, total: -1 })).toBe(false);
  expect(isResortPostsPage({ drawings: PAGE.posts, next: null, total: 1 })).toBe(false);
});

test("following and no more: PUT and DELETE, with the token", async () => {
  const fetchFn = replies({ status: 204 }, { status: 204 });
  expect((await followResort(API, "tok", "a b", true, { fetchFn })).kind).toBe("ok");
  expect((await followResort(API, "tok", "a b", false, { fetchFn })).kind).toBe("ok");
  expect(fetchFn.mock.calls[0][0]).toBe(`${API}/me/ski-resorts/a%20b/follow`);
  expect(fetchFn.mock.calls[0][1]?.method).toBe("PUT");
  expect(fetchFn.mock.calls[1][1]?.method).toBe("DELETE");
  expect(new Headers(fetchFn.mock.calls[0][1]?.headers).get("Authorization")).toBe(
    "Bearer tok",
  );
});

test("the resorts followed, and a resort's posts page by page", async () => {
  const fetchFn = replies(
    { status: 200, body: followed },
    { status: 200, body: PAGE },
    { status: 200, body: PAGE },
  );
  const mine = await fetchFollowedResorts(API, "tok", { fetchFn });
  expect(mine).toEqual({ kind: "ok", value: followed });
  expect((await fetchResortPosts(API, "tok", "aaa1", null, { fetchFn })).kind).toBe(
    "ok",
  );
  await fetchResortPosts(API, "tok", "aaa1", "17-ab", { fetchFn });
  expect(fetchFn.mock.calls[0][0]).toBe(`${API}/me/ski-resorts`);
  expect(fetchFn.mock.calls[1][0]).toBe(`${API}/ski-resorts/aaa1/drawings`);
  expect(fetchFn.mock.calls[2][0]).toBe(
    `${API}/ski-resorts/aaa1/drawings?cursor=17-ab`,
  );
});
