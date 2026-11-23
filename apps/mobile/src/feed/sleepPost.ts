import { SLEEP_SOURCE } from "@shaperoute/shared-types";

/**
 * Whether a drawing an API answered is the post of a night of sleep
 * (TASK-467 part E): a drawing without a run that carries its night in
 * `sleep`, told apart by its `source` as a post of photos only is
 * (isPhotoPost). Only an app that says `sleep` in X-MuW-Reads receives one.
 */
export function isSleepPost(post: { source?: string | null }): boolean {
  return post.source === SLEEP_SOURCE;
}
