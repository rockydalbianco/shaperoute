/**
 * A live share sent in a private message (TASK-468 part A1b, ADR-0381,
 * docs/API.md «Messages»). Mirrors services/api/shaperoute_api/messages.py.
 */

import type { MessageAttachment } from "./index.ts";
import type { LiveStatus } from "./liveShare.ts";

/**
 * The kind of an attachment that is a live share: a pointer, never a copy.
 * Only an app that says READS_MESSAGE_LIVE receives it, so it is not among
 * MESSAGE_ATTACHMENT_KINDS; the others read «[Live]» before the text.
 */
export const MESSAGE_LIVE_KIND = "live";
/** Said in the header X-MuW-Reads by an app that shows a live attached. */
export const READS_MESSAGE_LIVE = "live";

/** One's own live share going on, attached to a message in a conversation
 * open to who sends it. 404 for a share not one's own; 422 for one ended;
 * 409 in a request. «Send in MuW» (POST /me/live-shares/{id}/send) sends
 * the same message to each person. */
export interface MessageLiveRequest {
  live_share_id: string;
  media_id?: undefined;
  drawing?: undefined;
  post_id?: undefined;
}

/**
 * A live share as the conversation shows it to who asks, at every reading,
 * while it may see the share. GET /live-shares/{share_id} shows it whole.
 */
export interface MessageLiveCard {
  share_id: string;
  activity: string;
  status: LiveStatus;
  /** The last numbers the phone sent. */
  distance_m: number | null;
  duration_s: number | null;
  updated_at: string | null;
}

/** A message's attachment as an app that reads lives receives it:
 * `live` with the kind MESSAGE_LIVE_KIND; null once the share is gone or
 * who asks may not see it: «Live ended». Absent from an API of before. */
export interface MessageAttachmentWithLive extends Omit<MessageAttachment, "kind"> {
  kind: MessageAttachment["kind"] | typeof MESSAGE_LIVE_KIND;
  live?: MessageLiveCard | null;
}
