import {
  type MySleepPost,
  SLEEP_POST_VISIBILITIES,
  type SleepPostRequest,
  type SleepPostVisibility,
  type SleepSummary,
} from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";
import { isSleepSummary } from "./sleep";

/**
 * A night of sleep as a post of its own, on the API (TASK-467 part E,
 * ADR-0380 precisazione E, docs/API.md «Sleep»): published from the Feed's
 * «+» without an activity, one post a night, by the day the person woke
 * up. The bodies are packages/shared-types/fixtures/sleep-post*.json.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

/** The post of a night as its owner reads it. */
export function isMySleepPost(body: unknown): body is MySleepPost {
  if (!isSleepSummary(body)) {
    return false;
  }
  const { id, visibility, published_at } = body as unknown as Record<string, unknown>;
  return (
    typeof id === "string" &&
    id !== "" &&
    (SLEEP_POST_VISIBILITIES as readonly unknown[]).includes(visibility) &&
    typeof published_at === "string"
  );
}

function isEmpty(body: unknown, status: number): body is null {
  return status === 204 && body === null;
}

function pathOf(night: string): string {
  return `/me/sleep-posts/${encodeURIComponent(night)}`;
}

/** PUT /me/sleep-posts/{night}: the night in the Feed as a post, made and
 * published the first time; sent again, the same post with these figures
 * and this visibility. Only what the card shows goes: the score, the
 * minutes and the stages, and the day in the path. */
export function publishSleepPost(
  baseUrl: string,
  token: string,
  night: SleepSummary,
  visibility: SleepPostVisibility,
  options: Options = {},
): Promise<AccountOutcome<MySleepPost>> {
  const body: SleepPostRequest = {
    score: night.score,
    asleep_min: night.asleep_min,
    awake_min: night.awake_min,
    ...(night.stages === undefined ? {} : { stages: night.stages }),
    visibility,
  };
  return ask(
    baseUrl,
    pathOf(night.night),
    { method: "PUT", body, token },
    isMySleepPost,
    options,
  );
}

/** GET /me/sleep-posts/{night}: the post of that night, for its owner; 404
 * without one. */
export function fetchSleepPost(
  baseUrl: string,
  token: string,
  night: string,
  options: Options = {},
): Promise<AccountOutcome<MySleepPost>> {
  return ask(baseUrl, pathOf(night), { method: "GET", token }, isMySleepPost, options);
}

/** DELETE /me/sleep-posts/{night}: the post off the Feed; 204 the second
 * time too. Its night goes off the server with it unless the profile or an
 * activity still publishes it. */
export function removeSleepPost(
  baseUrl: string,
  token: string,
  night: string,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(baseUrl, pathOf(night), { method: "DELETE", token }, isEmpty, options);
}
