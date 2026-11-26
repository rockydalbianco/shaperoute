import {
  type ChallengePushKind,
  type ContestPushKind,
  type GroupPushKind,
  type GroupRunPushKind,
  type MessagePushKind,
  type Person,
  PLANNED_LIVE_PUSH_KIND,
} from "@shaperoute/shared-types";

/**
 * What a touched notification opens (TASK-262): the `data` the API put in
 * it (`PushData`, docs/API.md, «Push notifications»), read without trusting
 * it. A drawing for a reaction, a comment or a tag; the profile of who
 * acted for a follow request or a request accepted. «Play» for a shape of
 * the game unlocked (TASK-296): its data names the runner, but the shape is
 * in the collection. The challenge for a piece done, a shape completed or
 * a day left (TASK-296 part C): its data names the challenge; without a
 * good id, «Play» on its «Challenges» tab. The conversation with who wrote
 * for a message or a message request (TASK-319). The page of a monthly
 * challenge for its three notifications (TASK-343 part B): not the game's
 * challenge above. Anything else: nothing.
 */
export type TapTarget =
  | { kind: "drawing"; id: string }
  | { kind: "profile"; person: Person }
  | { kind: "conversation"; person: Person }
  | { kind: "play" }
  | { kind: "challenge"; id: string }
  | { kind: "contest"; id: string }
  /** A planned live that started (TASK-468 part B2b1): its live view. */
  | { kind: "live"; shareId: string; plannedLiveId: string }
  /** A group run soon, changed or cancelled (TASK-309 part B): its page. */
  | { kind: "group_run"; id: string }
  /** A request to join, a request accepted, an invite (TASK-495 part B):
   * the group's page. */
  | { kind: "group"; id: string }
  /** An item of one's gear past its limit (TASK-486 part G): the item. */
  | { kind: "gear"; id: string };

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The kinds of a challenge's notifications (TASK-296 part C). */
const CHALLENGE_KINDS: readonly ChallengePushKind[] = [
  "piece_done",
  "challenge_done",
  "challenge_ending",
];

/** The kinds of a private message's notifications (TASK-319). */
const MESSAGE_KINDS: readonly MessagePushKind[] = ["message", "message_request"];

/** The kinds of a group run's notifications (TASK-309). */
const GROUP_RUN_KINDS: readonly GroupRunPushKind[] = [
  "group_run_soon",
  "group_run_changed",
  "group_run_cancelled",
];

/** The kinds of a group's notifications (TASK-495). */
const GROUP_KINDS: readonly GroupPushKind[] = [
  "group_join_request",
  "group_join_accepted",
  "group_invite",
];

/** The kinds of a monthly challenge's notifications (TASK-343). */
const CONTEST_KINDS: readonly ContestPushKind[] = [
  "contest_open",
  "contest_last_days",
  "contest_results",
];

function field(data: object, name: string): string | null {
  const value: unknown = (data as Record<string, unknown>)[name];
  return typeof value === "string" ? value : null;
}

export function tapTarget(data: unknown): TapTarget | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const kind = field(data, "kind");
  // The game's own news (TASK-296; editions and frames, TASK-423 part E):
  // «Play». An older server sends the runner's profile with them too.
  if (
    kind === "shape_unlocked" ||
    kind === "edition_up" ||
    kind === "collection_done"
  ) {
    return { kind: "play" };
  }
  if (kind !== null && (CHALLENGE_KINDS as readonly string[]).includes(kind)) {
    const challenge = field(data, "challenge_id");
    return challenge !== null && ID.test(challenge)
      ? { kind: "challenge", id: challenge }
      : { kind: "play" };
  }
  if (kind !== null && (CONTEST_KINDS as readonly string[]).includes(kind)) {
    const contest = field(data, "contest_id");
    return contest !== null && ID.test(contest)
      ? { kind: "contest", id: contest }
      : null;
  }
  if (kind !== null && (GROUP_RUN_KINDS as readonly string[]).includes(kind)) {
    const groupRun = field(data, "group_run_id");
    return groupRun !== null && ID.test(groupRun)
      ? { kind: "group_run", id: groupRun }
      : null;
  }
  if (kind !== null && (GROUP_KINDS as readonly string[]).includes(kind)) {
    const group = field(data, "group_id");
    return group !== null && ID.test(group) ? { kind: "group", id: group } : null;
  }
  if (kind === "gear_limit") {
    const gear = field(data, "gear_id");
    return gear !== null && ID.test(gear) ? { kind: "gear", id: gear } : null;
  }
  if (kind === PLANNED_LIVE_PUSH_KIND) {
    const share = field(data, "share_id");
    const planned = field(data, "planned_live_id");
    return share !== null && ID.test(share) && planned !== null && ID.test(planned)
      ? { kind: "live", shareId: share, plannedLiveId: planned }
      : null;
  }
  const drawing = field(data, "drawing_id");
  if (drawing !== null && ID.test(drawing)) {
    return { kind: "drawing", id: drawing };
  }
  const publicId = field(data, "public_id");
  const username = field(data, "username");
  if (publicId !== null && ID.test(publicId) && username !== null && username !== "") {
    const person = { public_id: publicId, username, photo: null };
    return kind !== null && (MESSAGE_KINDS as readonly string[]).includes(kind)
      ? { kind: "conversation", person }
      : { kind: "profile", person };
  }
  return null;
}
