import type { FeedPost } from "@shaperoute/shared-types";
import feedSleep from "@shaperoute/shared-types/fixtures/feed-sleep.json";

/**
 * The post of a night as the app reads it from GET /feed (TASK-467 part
 * E), from the example the API's tests validate too
 * (fixtures/feed-sleep.json): a drawing without a run, `source` «sleep»,
 * its night in `sleep`. Its `activity`, null in the answer, is read as none
 * (api/drawings.ts).
 */
export function sleepFeedPost(changes: Record<string, unknown> = {}): FeedPost {
  const { activity: _none, ...post } = structuredClone(feedSleep.posts[0]);
  return { ...post, ...changes } as unknown as FeedPost;
}
