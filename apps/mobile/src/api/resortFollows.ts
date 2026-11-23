import type { FeedPost, SkiResorts } from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";
import { isFeedPost } from "./feed";
import { isSkiResorts } from "./skiResorts";

/**
 * The ski resorts a member follows, and the posts of a resort (TASK-406
 * part D3, ADR-0338, docs/API.md «Seguire una stazione e i suoi post»). The
 * bodies are packages/shared-types/fixtures/followed-resorts.json and
 * resort-posts.json.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

/** A page of the posts of the days skied at a resort, each with its author. */
export type ResortPostsPage = { posts: FeedPost[]; next: string | null; total: number };

function isEmpty(body: unknown, status: number): body is null {
  return status === 204 && body === null;
}

export function isResortPostsPage(body: unknown): body is ResortPostsPage {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { posts, next, total } = body as Record<string, unknown>;
  return (
    Array.isArray(posts) &&
    posts.every(isFeedPost) &&
    (next === null || typeof next === "string") &&
    typeof total === "number" &&
    Number.isInteger(total) &&
    total >= 0
  );
}

/** PUT or DELETE /me/ski-resorts/{id}/follow: 204 either way. */
export function followResort(
  baseUrl: string,
  token: string,
  resortId: string,
  on: boolean,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(
    baseUrl,
    `/me/ski-resorts/${encodeURIComponent(resortId)}/follow`,
    { method: on ? "PUT" : "DELETE", token },
    isEmpty,
    options,
  );
}

/** GET /me/ski-resorts: «Your resorts», the last followed first. */
export function fetchFollowedResorts(
  baseUrl: string,
  token: string,
  options: Options = {},
): Promise<AccountOutcome<SkiResorts>> {
  return ask(
    baseUrl,
    "/me/ski-resorts",
    { method: "GET", token },
    isSkiResorts,
    options,
  );
}

/** GET /ski-resorts/{id}/drawings: the posts the asker sees, the latest first. */
export function fetchResortPosts(
  baseUrl: string,
  token: string,
  resortId: string,
  cursor: string | null,
  options: Options = {},
): Promise<AccountOutcome<ResortPostsPage>> {
  const after = cursor === null ? "" : `?cursor=${encodeURIComponent(cursor)}`;
  return ask(
    baseUrl,
    `/ski-resorts/${encodeURIComponent(resortId)}/drawings${after}`,
    { method: "GET", token },
    isResortPostsPage,
    options,
  );
}
