/**
 * The planned lives and the Feed's row of lives (TASK-468 part A2a,
 * ADR-0381, docs/API.md «Planned lives»). Mirrors
 * services/api/shaperoute_api/planned_lives.py.
 */

import type { RunActivity } from "./index.ts";

export const PLANNED_LIVE_TITLE_MAX = 60;
/** How far ahead a live may be planned. */
export const PLANNED_LIVE_LATEST_DAYS = 60;
/** The user's choice 3: a planned live starts from an hour before its time
 * to three hours after. */
export const PLANNED_LIVE_EARLY_START_S = 3600;
export const PLANNED_LIVE_OVER_AFTER_S = 3 * 3600;
/** Planned lives not over, per account. */
export const PLANNED_LIVES_MAX = 10;

export type PlannedLiveAudience = "followers" | "everyone";
export type LiveItemState = "planned" | "live" | "paused" | "finished" | "ended";

/** POST /me/planned-lives: fixtures/planned-live-request.json. */
export interface PlannedLiveRequest {
  activity: RunActivity;
  title: string;
  /** ISO 8601 with its offset; from now to 60 days ahead. */
  starts_at: string;
  /** Default "followers". */
  audience_feed?: PlannedLiveAudience;
  /** Default false. */
  heart_visible?: boolean;
}

/** PUT /me/planned-lives/{id}: what is given changes, before the start. */
export interface PlannedLiveChange {
  activity?: RunActivity | null;
  title?: string | null;
  starts_at?: string | null;
  audience_feed?: PlannedLiveAudience | null;
  heart_visible?: boolean | null;
}

/** POST /me/planned-lives/{id}/start: 201 LiveShareCreated (a LiveShareMade
 * when `link` is false, the default). */
export interface PlannedLiveStart {
  link?: boolean;
  pool_length_m?: number | null;
}

/** PUT /me/planned-lives/{id}/post: the post the live became. */
export interface PlannedLivePost {
  drawing_id: string;
}

/** A live in the Feed's row, on a profile or on its own:
 * fixtures/planned-live.json. */
export interface LiveItem {
  /** The planned live's id; for a live put in the Feed without planning,
   * its share's id. */
  id: string;
  planned_live_id: string | null;
  /** While going on or finished: GET /live-shares/{id} shows it. */
  share_id: string | null;
  owner: { public_id: string; username: string; photo: string | null };
  activity: string;
  title: string | null;
  starts_at: string | null;
  state: LiveItemState;
  audience_feed: PlannedLiveAudience;
  heart_visible: boolean;
  /** The last numbers of a live going on, for its card. */
  distance_m: number | null;
  duration_s: number | null;
  /** The viewer asked «Remind me». */
  reminded: boolean;
  /** Only for its owner, within its hours and not going on. */
  can_start: boolean;
  post_id: string | null;
}

/** GET /lives?limit=&cursor=: fixtures/lives-page.json. One's own and the
 * followed accounts' lives (the user's choice 7), the going on first. */
export interface LivesPage {
  lives: LiveItem[];
  next: string | null;
}

/** The push to who asked «Remind me» (TASK-468 part A2b), at a planned
 * live's first start: «{name} is live: {title}». Its data opens the live
 * view: fixtures/planned-live-push-data.json. */
export const PLANNED_LIVE_PUSH_KIND = "planned_live_started";

export interface PlannedLivePushData {
  kind: typeof PLANNED_LIVE_PUSH_KIND;
  planned_live_id: string;
  share_id: string;
}
