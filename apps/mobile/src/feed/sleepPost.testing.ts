import type { FeedPost } from "@shaperoute/shared-types";
import feedPhotos from "@shaperoute/shared-types/fixtures/feed-photos.json";
import summary from "@shaperoute/shared-types/fixtures/sleep-summary.json";

/**
 * The post of a night as the app reads it from GET /feed (TASK-467 part
 * E): a drawing without a run, as a post of photos only, with no photo,
 * `source` «sleep» and its night in `sleep`. Its `activity`, null in the
 * answer, is read as none (api/drawings.ts).
 */
export function sleepFeedPost(changes: Record<string, unknown> = {}): FeedPost {
  const { activity: _none, ...post } = structuredClone(feedPhotos.posts[0]);
  return {
    ...post,
    title: null,
    description: null,
    source: "sleep",
    photos: [],
    sleep: structuredClone(summary),
    ...changes,
  } as unknown as FeedPost;
}
