/**
 * «Share live activity» (TASK-424, ADR-0352, docs/API.md «Live shares»): a
 * link that shows a recording live, on a page of the site, to whoever has
 * it, without the app or an account. Mirrors
 * services/api/shaperoute_api/live_shares.py.
 */

import type { RunActivity } from "./index.ts";

/** The page of a link: the token comes after the `#`. */
export const LIVE_PAGE = "https://getmuw.app/live/#";
/** A link lasts at most this long from when it is made. */
export const LIVE_LINK_LIFE_S = 24 * 3600;
/** After the activity ends, the link shows its summary this long. */
export const LIVE_AFTER_FINISH_S = 3600;
/** The phone sends an update this often while moving, and while paused. */
export const LIVE_UPDATE_EVERY_S = 15;
export const LIVE_PAUSED_UPDATE_EVERY_S = 60;
/** The page asks this often. */
export const LIVE_VIEW_EVERY_S = 10;
/** At most this many points in one update, and a point every this many
 * seconds at most. */
export const LIVE_POINTS_PER_UPDATE_MAX = 200;
export const LIVE_POINT_EVERY_S = 5;
/** Links an account may make in a day. */
export const LIVE_SHARES_PER_DAY_MAX = 20;

/** The chat (TASK-468, ADR-0381): people in one send, and sends a minute. */
export const LIVE_RECIPIENTS_MAX = 20;
export const LIVE_SENDS_PER_MINUTE_MAX = 20;

/** Who sees a share in the Feed (TASK-468, the user's choice 1). */
export const LIVE_AUDIENCES = ["none", "followers", "everyone"] as const;
export type LiveAudience = (typeof LIVE_AUDIENCES)[number];

/** POST /me/live-shares: fixtures/live-share-request.json. */
export interface LiveShareRequest {
  activity: RunActivity;
  /** A swim in a pool: the page shows lengths, with no map. */
  pool_length_m?: number | null;
  /** Make the link now (the default). False for a share only in the chat
   * or the Feed: `url` is null, POST /me/live-shares/{id}/link makes it. */
  link?: boolean;
  /** Default "none". */
  audience_feed?: LiveAudience;
  /** The heart rate to the viewers in the app; default false. The link
   * always shows it. */
  heart_visible?: boolean;
}

/** 201: the new link. `url` carries the token, never given again. Also the
 * answer of POST /me/live-shares/{id}/link, which makes a new token (the
 * old link stops). */
export interface LiveShareCreated {
  id: string;
  url: string;
  expires_at: string;
}

/** 201 for a request with `link: false` (TASK-468): `url` is null until
 * POST /me/live-shares/{id}/link. */
export interface LiveShareMade extends Omit<LiveShareCreated, "url"> {
  url: string | null;
}

/** PATCH /me/live-shares/{id}: what is given changes. 410 once ended. */
export interface LiveAudienceChange {
  audience_feed?: LiveAudience | null;
  heart_visible?: boolean | null;
}

/** POST /me/live-shares/{id}/send: fixtures/live-share-send-request.json.
 * The people, by public_id; 1 to LIVE_RECIPIENTS_MAX. */
export interface LiveShareSend {
  to: string[];
}

/** Who may now see the share in the app, and who not: no such account,
 * oneself, or kept apart by a block (the same answer for all). */
export interface LiveShareSent {
  sent: string[];
  skipped: string[];
}

/** A fix, exact as the phone took it. */
export interface LivePoint {
  lat: number;
  lon: number;
  at: string;
}

/** The numbers of the moment. The page works out the average pace or
 * speed from distance and time. */
export interface LiveStats {
  distance_m?: number;
  /** Without the pauses, at the time of the update. */
  duration_s?: number;
  climb_m?: number | null;
  kcal?: number | null;
  /** From a watch, when it sends it. */
  heart_bpm?: number | null;
  /** A swim in a pool: the lengths the app estimates. */
  lengths?: number | null;
  /** At the gym: the exercise in progress. */
  exercise?: string | null;
  /** A paragliding flight (TASK-305 parts R, ADR-0375): the height now and
   * the highest so far, metres above the sea, from the phone's fixes. */
  alt_m?: number | null;
  max_alt_m?: number | null;
  /** Climbing (+) or sinking (-), metres a second, over the last seconds. */
  vario_mps?: number | null;
  /** The speed over the ground now, metres a second. */
  speed_mps?: number | null;
}

export type LiveState = "live" | "paused" | "finished";
export type LiveStatus = LiveState | "stopped" | "expired";

/** POST /me/live-shares/{id}/updates: fixtures/live-share-update.json. 410
 * once the link has ended (stopped, expired or finished). */
export interface LiveUpdate {
  points: LivePoint[];
  stats: LiveStats;
  state: LiveState;
}

/** The answer to an update, and to PATCH. */
export interface LiveShare {
  id: string;
  status: LiveStatus;
  expires_at: string;
  /** TASK-468: absent from a server of before. */
  link?: boolean;
  audience_feed?: LiveAudience;
  heart_visible?: boolean;
}

/** GET /live?t=<token>&after=<seq>, without the API key:
 * fixtures/live-view.json. The same from GET /live-shares/{id}?after=<seq>
 * with the account's token (TASK-468): 404 to whoever may not see it, and
 * `stats.heart_bpm` null unless the owner turned `heart_visible` on. For a link stopped, expired or never made, only
 * `status`. `points` are [lat, lon, epoch seconds]. */
export interface LiveView {
  status: LiveStatus;
  activity?: string | null;
  pool_length_m?: number | null;
  started_at?: string | null;
  updated_at?: string | null;
  finished_at?: string | null;
  expires_at?: string | null;
  stats?: LiveStats | null;
  points: [number, number, number][];
  /** The `after` of the next request. */
  last_seq: number;
  /** More points than one answer holds: ask again at once. */
  more: boolean;
}

// A live share in a private message (TASK-468 part A1b).
export * from "./messageLive.ts";
