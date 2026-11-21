import assert from "node:assert/strict";
import { test } from "node:test";

import drawingDetails from "../fixtures/drawing-details-photos.json" with { type: "json" };
import feedImported from "../fixtures/feed-imported.json" with { type: "json" };
import feed from "../fixtures/feed-photos.json" with { type: "json" };
import myPhotoPost from "../fixtures/my-photo-post.json" with { type: "json" };
import myPhotoPosts from "../fixtures/my-photo-posts.json" with { type: "json" };
import order from "../fixtures/photo-post-order-request.json" with { type: "json" };
import request from "../fixtures/photo-post-request.json" with { type: "json" };
import reads from "../fixtures/reads.json" with { type: "json" };
import {
  isPhotoPost,
  type MyPhotoPost,
  type MyPhotoPosts,
  PHOTO_POST_MAX_PHOTOS,
  PHOTO_POST_VISIBILITIES,
  type PhotoDrawingDetail,
  type PhotoFeedPost,
  type PhotoPostOrderRequest,
  type PhotoPostRequest,
  type PhotoPostVisibility,
  PHOTOS_SOURCE,
} from "../src/index.ts";

// A post of photos only (TASK-312 part C, ADR-0272): a drawing without a
// run. The same JSON is validated by the API's tests/test_photo_posts.py.

function visibility(value: string): PhotoPostVisibility {
  const found = PHOTO_POST_VISIBILITIES.find((v) => v === value);
  assert.ok(found, value);
  return found;
}

function photos(value: string): typeof PHOTOS_SOURCE {
  assert.equal(value, PHOTOS_SOURCE);
  return PHOTOS_SOURCE;
}

const asked: PhotoPostRequest = {
  ...request,
  visibility: visibility(request.visibility),
};
const ordered: PhotoPostOrderRequest = order;
const mine: MyPhotoPost = {
  ...myPhotoPost,
  visibility: visibility(myPhotoPost.visibility),
};
const [listed] = feed.posts;
assert.ok(listed);
const post: PhotoFeedPost = {
  ...listed,
  place: null,
  shape: null,
  word: null,
  style: null,
  route_title: null,
  distance_m: 0,
  duration_s: 0,
  score: null,
  fidelity: null,
  visibility: visibility(listed.visibility),
  activity: null,
  source: photos(listed.source),
  rotation_deg: null,
  ski_descents: null,
  flight_split: null,
  sleep: null,
  linkable: false,
  track_preview: [],
};
const whole: PhotoDrawingDetail = {
  ...drawingDetails,
  place: null,
  shape: null,
  word: null,
  style: null,
  route_title: null,
  distance_m: 0,
  duration_s: 0,
  score: null,
  fidelity: null,
  visibility: visibility(drawingDetails.visibility),
  activity: null,
  source: photos(drawingDetails.source),
  rotation_deg: null,
  ski_descents: null,
  flight_split: null,
  sleep: null,
  linkable: false,
  track: [],
  stats: null,
};

test("a post of photos only is a drawing without a run, in every answer", () => {
  assert.ok(isPhotoPost(post));
  assert.ok(isPhotoPost(whole));
  for (const field of [
    "place",
    "shape",
    "word",
    "style",
    "route_title",
    "activity",
  ] as const) {
    assert.equal(listed[field], null, field);
    assert.equal(drawingDetails[field], null, field);
  }
  assert.deepEqual([listed.distance_m, listed.duration_s], [0, 0]);
  assert.deepEqual(listed.track_preview, []);
  assert.deepEqual(drawingDetails.track, []);
  // Dated when it was published; the same post in each.
  assert.equal(whole.started_at, whole.published_at);
  assert.equal(post.id, mine.id);
  assert.equal(whole.id, mine.id);
});

test("it is for everyone or the followers, never only its owner", () => {
  assert.deepEqual(PHOTO_POST_VISIBILITIES, ["everyone", "followers"]);
  assert.equal(asked.visibility, "everyone");
  assert.ok(mine.published_at);
});

test("up to ten photos, ordered without a map", () => {
  assert.equal(PHOTO_POST_MAX_PHOTOS, 10);
  assert.ok(ordered.order.every((item) => /^photo:([1-9]|10)$/.test(item)));
  assert.ok(!ordered.order.includes("drawing"));
});

test("only an app that says photos receives one", () => {
  assert.ok(reads.kinds.includes(PHOTOS_SOURCE));
  // The app of today does not say it yet: part C's app will.
  assert.ok(!reads.this_app.split(",").includes(PHOTOS_SOURCE));
});

test("a post of a run is not one", () => {
  const [run] = feedImported.posts;
  assert.ok(run);
  assert.ok(!isPhotoPost(run));
  assert.ok(!isPhotoPost({}));
});

test("the account lists its posts with their keys, the waiting one too", () => {
  const listed: MyPhotoPosts = {
    photo_posts: myPhotoPosts.photo_posts.map((post) => ({
      ...post,
      visibility: visibility(post.visibility),
    })),
  };
  const [waiting, published] = listed.photo_posts;
  assert.ok(waiting && published);
  assert.equal(waiting.published_at, null);
  assert.deepEqual(waiting.photos, []);
  assert.ok(published.published_at);
  assert.notEqual(waiting.key, published.key);
});
