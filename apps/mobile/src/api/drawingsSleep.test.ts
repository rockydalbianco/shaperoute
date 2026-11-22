import drawingDetailsPhotos from "@shaperoute/shared-types/fixtures/drawing-details-photos.json";
import feed from "@shaperoute/shared-types/fixtures/feed.json";
import feedSleep from "@shaperoute/shared-types/fixtures/feed-sleep.json";
import summary from "@shaperoute/shared-types/fixtures/sleep-summary.json";

import { isDrawingDetail } from "./drawings";
import { isFeedPage } from "./feed";

// The post of a night of sleep as the API answers it (TASK-467 part E): a
// drawing without a run, so with a null activity, read as none. One post
// the app could not read would take the whole page of the Feed with it.

test("the Feed's example is read, with no activity and its night", () => {
  const page = structuredClone(feedSleep);
  expect(isFeedPage(page)).toBe(true);
  const [post] = page.posts;
  expect("activity" in post).toBe(false);
  expect(post.source).toBe("sleep");
  expect(post.sleep).toEqual(summary);
});

test("a page with a run's drawing and the post of a night is read whole", () => {
  const page = {
    ...structuredClone(feed),
    posts: [...structuredClone(feedSleep.posts), structuredClone(feed.posts[0])],
  };
  expect(isFeedPage(page)).toBe(true);
  expect(page.posts).toHaveLength(2);
});

test("the post opened whole is read too", () => {
  const whole = {
    ...structuredClone(drawingDetailsPhotos),
    title: null,
    description: null,
    source: "sleep",
    photos: [],
    sleep: structuredClone(summary),
  };
  expect(isDrawingDetail(whole)).toBe(true);
  expect("activity" in whole).toBe(false);
});

test("any other drawing with a null activity is still refused", () => {
  const page = structuredClone(feedSleep);
  expect(isFeedPage({ ...page, posts: [{ ...page.posts[0], source: "muw" }] })).toBe(
    false,
  );
  const noSource: Record<string, unknown> = { ...page.posts[0] };
  delete noSource.source;
  expect(isFeedPage({ ...page, posts: [noSource] })).toBe(false);
});
