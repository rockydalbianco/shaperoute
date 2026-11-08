/**
 * The ski resorts a member follows and the posts of a resort (TASK-406 part
 * D3, ADR-0338, docs/API.md «Ski resorts»). Mirrors
 * services/api/shaperoute_api/resort_follows.py.
 *
 * - PUT and DELETE /me/ski-resorts/{id}/follow: 204; 404 for a resort that
 *   is not there (PUT only).
 * - GET /me/ski-resorts: «Your resorts», the last followed first, in the
 *   shape of GET /ski-resorts (`away_m` null): fixtures/followed-resorts.json.
 * - GET /ski-resorts/{id}/drawings?cursor: the posts of the days skied there
 *   that the asker sees, the latest first, each with its author as in the
 *   feed: fixtures/resort-posts.json.
 */

import type { FeedPost } from "./index.ts";
import type { SkiResorts } from "./skiResorts.ts";

/** The resorts followed are a few, never a page. */
export const FOLLOWED_RESORTS_MAX = 200;

export type FollowedResorts = SkiResorts;

/** A page of the posts of a resort; `total` counts them all. */
export interface ResortPosts {
  posts: FeedPost[];
  next: string | null;
  total: number;
}
