import {
  GYM_PLAN_GOALS,
  GYM_PLAN_MODES,
  type GymPlanPosted,
  type GymPlanSession,
  type MyPlanPost,
  PLAN_POST_VISIBILITIES,
  type PlanPostRequest,
  type PlanPostVisibility,
} from "@shaperoute/shared-types";

import { keptList } from "../storage/keptList";
import { type AccountOutcome, ask } from "./accounts";
import { worthAgain } from "./drawings";
import { isGymPlanItem, isGymPlanRun } from "./gymPlans";

/**
 * A gym plan as a post (TASK-485 part B, ADR-0394, docs/API.md «Plan
 * posts»): a drawing without a run that carries a copy of the plan as it
 * was at «Post», made with a key the phone chose. Others read it as any
 * drawing, with `source: "plan"` and the copy in `plan`.
 *
 * «Post» goes first into a file on the phone, then to the API, now or when
 * there is a network: a plan posted without one goes later, with the same
 * key, so a «Post» sent twice is one post. Once on the API it stays in the
 * file with the id the others open it by, so that its owner can still
 * delete it from this phone.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

function postPath(key: string): string {
  return `/me/plan-posts/${encodeURIComponent(key)}`;
}

function isRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body);
}

function isDay(day: unknown): boolean {
  return Number.isInteger(day) && (day as number) >= 1 && (day as number) <= 7;
}

function isSessions(body: unknown): body is GymPlanSession[] {
  return (
    Array.isArray(body) &&
    body.every(
      (one) =>
        isRecord(one) &&
        isDay(one.day) &&
        typeof one.name === "string" &&
        Array.isArray(one.items) &&
        one.items.every(isGymPlanItem) &&
        (one.run === undefined || isGymPlanRun(one.run)) &&
        (one.outing === undefined || isRecord(one.outing)),
    )
  );
}

export function isPlanPostVisibility(value: unknown): value is PlanPostVisibility {
  return PLAN_POST_VISIBILITIES.some((visibility) => visibility === value);
}

/**
 * A plan as a post carries it: its name, days, exercises and, made with
 * the guide, its weeks. Never its first day nor its owner's paces: an
 * answer with them is not one this app shows.
 */
export function isGymPlanPosted(body: unknown): body is GymPlanPosted {
  if (
    !isRecord(body) ||
    typeof body.name !== "string" ||
    !Array.isArray(body.days) ||
    !body.days.every(isDay) ||
    !Array.isArray(body.items) ||
    !body.items.every(isGymPlanItem)
  ) {
    return false;
  }
  const program = body.program;
  if (program === undefined || program === null) {
    return true;
  }
  return (
    isRecord(program) &&
    program.starts_on === undefined &&
    program.runner === undefined &&
    (program.goal === undefined ||
      (GYM_PLAN_GOALS as readonly unknown[]).includes(program.goal)) &&
    Number.isInteger(program.weeks) &&
    (program.weeks as number) >= 1 &&
    (GYM_PLAN_MODES as readonly unknown[]).includes(program.mode) &&
    typeof program.step_kg === "number" &&
    isSessions(program.sessions) &&
    Array.isArray(program.custom) &&
    program.custom.every(
      (week) =>
        isRecord(week) && Number.isInteger(week.week) && isSessions(week.sessions),
    ) &&
    (program.target === undefined ||
      (isRecord(program.target) && program.target.on === undefined))
  );
}

export function isMyPlanPost(body: unknown): body is MyPlanPost {
  return (
    isRecord(body) &&
    typeof body.key === "string" &&
    typeof body.id === "string" &&
    (body.description === null || typeof body.description === "string") &&
    isPlanPostVisibility(body.visibility) &&
    typeof body.published_at === "string" &&
    isGymPlanPosted(body.plan)
  );
}

function isNothing(body: unknown): body is null {
  return body === null || body === undefined || body === "";
}

/** PUT /me/plan-posts/{key}: made and published the first time; sent
 * again, only its line and who sees it change. */
export function savePlanPost(
  baseUrl: string,
  token: string,
  key: string,
  request: PlanPostRequest,
  options: Options = {},
): Promise<AccountOutcome<MyPlanPost>> {
  return ask(
    baseUrl,
    postPath(key),
    { method: "PUT", body: request, token },
    isMyPlanPost,
    options,
  );
}

/** GET /me/plan-posts/{key}: one's own; 404 without one. */
export function fetchMyPlanPost(
  baseUrl: string,
  token: string,
  key: string,
  options: Options = {},
): Promise<AccountOutcome<MyPlanPost>> {
  return ask(baseUrl, postPath(key), { method: "GET", token }, isMyPlanPost, options);
}

/** DELETE /me/plan-posts/{key}: 204, also for one that is not there. */
export function removePlanPost(
  baseUrl: string,
  token: string,
  key: string,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(baseUrl, postPath(key), { method: "DELETE", token }, isNothing, options);
}

// The file of the plans posted from this phone.

export const PLAN_POST_OUTBOX_FILE = "plan-post-outbox.json";
/** The posts of one account waiting to go up. */
export const MAX_PLAN_POSTS_WAITING = 20;
/** The posts already on the API this phone remembers, to delete them. */
export const MAX_PLAN_POSTS_SENT = 50;

export type PlanPostKept = {
  /** The account it belongs to (User.id). */
  owner: number;
  /** The key the phone made for it (gymKey). */
  key: string;
  /** What «Post» sent. */
  request: PlanPostRequest;
  /** «waiting»: not on the API yet; «sent»: on the API, as `id`;
   * «deleted»: deleted here, the API not told yet. */
  state: "waiting" | "sent" | "deleted";
  /** What the others open it with, once on the API. */
  id: string | null;
  /** When it was posted here, in ms: the oldest goes first. */
  at: number;
  /** The API will not take it (422): it is not sent again. */
  refused?: string;
};

function isPlanPostKept(value: unknown): value is PlanPostKept {
  if (!isRecord(value)) {
    return false;
  }
  const request = value.request;
  return (
    typeof value.owner === "number" &&
    typeof value.key === "string" &&
    (value.state === "waiting" ||
      value.state === "sent" ||
      value.state === "deleted") &&
    (value.id === null || typeof value.id === "string") &&
    typeof value.at === "number" &&
    isRecord(request) &&
    isGymPlanPosted(request.plan) &&
    (request.description === undefined ||
      request.description === null ||
      typeof request.description === "string") &&
    isPlanPostVisibility(request.visibility)
  );
}

// Written so that a write cut short loses no post that was there (TASK-252).
const kept = keptList(PLAN_POST_OUTBOX_FILE, isPlanPostKept);

/** Every post of the file, of every account. */
export function loadPlanPosts(): PlanPostKept[] {
  return kept.load();
}

/** What «Post» did: kept, too many waiting, or the phone refused the file. */
export type PlanPostKeep = "kept" | "full" | "not_written";

/** Keeps a plan posted, `key` made by the caller, until the API has it. */
export function keepPlanPost(
  owner: number,
  key: string,
  request: PlanPostRequest,
  nowMs: number = Date.now(),
): PlanPostKeep {
  const list = kept.load();
  const waiting = list.filter((one) => one.owner === owner && one.state === "waiting");
  if (waiting.length >= MAX_PLAN_POSTS_WAITING) {
    return "full";
  }
  const next: PlanPostKept = {
    owner,
    key,
    request,
    state: "waiting",
    id: null,
    at: nowMs,
  };
  return kept.save([
    ...list.filter((one) => !(one.owner === owner && one.key === key)),
    next,
  ])
    ? "kept"
    : "not_written";
}

/** The key of one's own post opened by its id, when this phone posted it. */
export function planPostKeyOf(owner: number, id: string): string | null {
  return (
    kept
      .load()
      .find((one) => one.owner === owner && one.id === id && one.state === "sent")
      ?.key ?? null
  );
}

/** Marks the post `key` of `owner` as deleted here: the API is told. A post
 * that never went up is just forgotten. */
export function keepPlanPostDeleted(owner: number, key: string): boolean {
  const list = kept.load();
  const before = list.find((one) => one.owner === owner && one.key === key);
  if (before === undefined) {
    return true;
  }
  const others = list.filter((one) => one !== before);
  return kept.save(
    before.state === "waiting" ? others : [...others, { ...before, state: "deleted" }],
  );
}

/** Forgets every post of `owner`: its account was deleted. */
export function forgetPlanPostsOf(owner: number): void {
  const list = kept.load();
  kept.save(list.filter((one) => one.owner !== owner));
}

function update(
  owner: number,
  key: string,
  change: (one: PlanPostKept) => PlanPostKept | null,
): void {
  const list = kept.load();
  const next = list.flatMap((one) => {
    if (one.owner !== owner || one.key !== key) {
      return [one];
    }
    const changed = change(one);
    return changed === null ? [] : [changed];
  });
  // Only the newest sent are remembered.
  const sent = next
    .filter((one) => one.owner === owner && one.state === "sent")
    .sort((a, b) => b.at - a.at);
  const forgotten = new Set(sent.slice(MAX_PLAN_POSTS_SENT));
  kept.save(next.filter((one) => !forgotten.has(one)));
}

/** What a round of sending did: something reached the API, and whether it
 * stopped for want of a network. */
export type PlanPostsSent = { sent: boolean; stopped: boolean };

/**
 * Sends the posts of `owner` still waiting, the oldest first, and tells the
 * API of those deleted here. A round stops at the first call that may work
 * later (no network, the API busy): the rest waits for the next.
 */
export async function sendWaitingPlanPosts(
  url: string,
  token: string,
  owner: number,
  options: { fetchFn?: typeof fetch } = {},
): Promise<PlanPostsSent> {
  let sent = false;
  const waiting = kept
    .load()
    .filter((one) => one.owner === owner && one.state !== "sent" && !one.refused)
    .sort((a, b) => a.at - b.at);
  for (const one of waiting) {
    if (one.state === "deleted") {
      const gone = await removePlanPost(url, token, one.key, options);
      if (gone.kind !== "ok" && worthAgain(gone)) {
        return { sent, stopped: true };
      }
      update(owner, one.key, () => null);
      sent = true;
      continue;
    }
    const post = await savePlanPost(url, token, one.key, one.request, options);
    if (post.kind === "ok") {
      update(owner, one.key, (now) =>
        // Deleted while it went: it is deleted next.
        now.state === "deleted"
          ? { ...now, id: post.value.id }
          : { ...now, state: "sent", id: post.value.id },
      );
      sent = true;
      continue;
    }
    // No network, the API busy, or a session ended: it waits.
    if (
      worthAgain(post) ||
      (post.kind === "api_error" &&
        (post.code === "session_expired" || post.code === "not_signed_in"))
    ) {
      return { sent, stopped: true };
    }
    if (post.kind === "api_error") {
      // Refused (a plan the API will not take, a key of another post): it
      // stays here, marked, and is not sent again.
      const refused = post.code;
      update(owner, one.key, (now) => ({ ...now, refused }));
    }
  }
  return { sent, stopped: false };
}
