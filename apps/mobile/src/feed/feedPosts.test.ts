import page from "@shaperoute/shared-types/fixtures/feed.json";
import type { FeedPost } from "@shaperoute/shared-types";

import { dayLabel } from "../activities/activityText";
import { isShown, shownPost, whatWasDrawn } from "./feedPosts";
import { postFacts } from "./FeedPost";
import { SAMPLE_FEED } from "./sampleFeed";

const [STAR, WORD] = page.posts as FeedPost[];

test("a member's drawing is shown as the examples are, and keeps itself to open", () => {
  const post = shownPost(STAR);
  expect(post).toMatchObject({
    id: STAR.id,
    user: "Ada_runs",
    title: "Sunday heart by the river",
    city: "Trento",
    shape: "star",
    what: "Star",
    route_m: 4004,
    minutes: 19,
    line: STAR.track_preview,
    activity: "running",
    rotation_deg: -30,
    drawing: STAR,
  });
  expect(isShown(post)).toBe(true);
  expect(isShown(SAMPLE_FEED[0])).toBe(false);
  expect(postFacts(post)).toBe("Star · 4.0 km · 19 min");
});

test("without a title the day it was run names it; a word is written as it is", () => {
  const post = shownPost(WORD);
  expect(post.title).toBe(dayLabel(WORD.started_at));
  expect(post.title).not.toBe("");
  expect(post.city).toBe("Rovereto");
  expect(post.what).toBe("ciao");
  expect(post.rotation_deg).toBeUndefined();
  // On a bike, the facts say so first, as a paddle's do.
  expect(postFacts(post)).toBe("Bike · ciao · 6.1 km · 34 min");
});

test("what was drawn: the shape, the word, the route's title, or nothing", () => {
  expect(whatWasDrawn(STAR)).toBe("Star");
  expect(whatWasDrawn({ ...STAR, shape: "dog_head" })).toBe("Dog head");
  expect(whatWasDrawn(WORD)).toBe("ciao");
  expect(whatWasDrawn({ ...WORD, word: null, route_title: "Castles" })).toBe("Castles");
  expect(whatWasDrawn({ ...WORD, word: null })).toBeNull();
  // A run without a route says how far and how long, and no place.
  const bare = shownPost({ ...WORD, word: null, place: null, activity: "running" });
  expect(bare.what).toBeNull();
  expect(bare.city).toBe("");
  expect(postFacts(bare)).toBe("6.1 km · 34 min");
});
