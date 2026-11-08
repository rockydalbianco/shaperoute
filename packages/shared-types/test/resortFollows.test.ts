import assert from "node:assert/strict";
import { test } from "node:test";

import followed from "../fixtures/followed-resorts.json" with { type: "json" };
import resortPosts from "../fixtures/resort-posts.json" with { type: "json" };
import {
  FOLLOWED_RESORTS_MAX,
  type FollowedResorts,
  type ResortPosts,
} from "../src/index.ts";

// The same JSON is validated by the API's test_resort_follows.py (TASK-406
// part D3).
test("the resorts followed are the search's resorts, without a distance", () => {
  const resorts = followed as unknown as FollowedResorts;
  assert.ok(resorts.resorts.length > 0);
  assert.ok(resorts.resorts.length <= FOLLOWED_RESORTS_MAX);
  for (const resort of resorts.resorts) {
    assert.equal(resort.away_m, null);
    assert.equal(typeof resort.name, "string");
  }
});

test("the posts of a resort are feed posts, with their authors", () => {
  const page = resortPosts as unknown as ResortPosts;
  assert.ok(page.posts.length > 0);
  assert.equal(page.total, page.posts.length);
  for (const post of page.posts) {
    assert.equal(post.activity, "skiing");
    assert.equal(typeof post.author.username, "string");
  }
});
