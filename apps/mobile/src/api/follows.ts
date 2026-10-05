import { type Follow, FOLLOW_STATES, type PeoplePage } from "@shaperoute/shared-types";

import { accountProblem } from "../account/messages";
import { t } from "../i18n";
import { type AccountOutcome, ask } from "./accounts";
import { isPerson } from "./people";

/**
 * Following (TASK-211, ADR-0173): the calls of docs/API.md, «Follow», all
 * with the session token. A member asks to follow another, who accepts or
 * declines; only a request accepted counts. The bodies are
 * packages/shared-types/fixtures/follow.json and people-page.json.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

/** The lists of the account: who asks to follow it, who does, whom it follows. */
export const FOLLOW_LISTS = ["requests", "followers", "following"] as const;
export type FollowList = (typeof FOLLOW_LISTS)[number];

const LIST_PATHS: Record<FollowList, string> = {
  requests: "/me/follow-requests",
  followers: "/me/followers",
  following: "/me/following",
};

function followPath(publicId: string): string {
  return `/users/${encodeURIComponent(publicId)}/follow`;
}

/**
 * POST /users/{public_id}/follow: asks to follow. The answer is where the
 * one who asked stands now: `requested`, or `following` if the other had
 * already accepted. Asked again, nothing changes.
 */
export function askToFollow(
  baseUrl: string,
  token: string,
  publicId: string,
  options: Options = {},
): Promise<AccountOutcome<Follow>> {
  return ask(
    baseUrl,
    followPath(publicId),
    { method: "POST", token },
    isFollow,
    options,
  );
}

/** DELETE /users/{public_id}/follow: takes the request back, or stops following. */
export function stopFollowing(
  baseUrl: string,
  token: string,
  publicId: string,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(
    baseUrl,
    followPath(publicId),
    { method: "DELETE", token },
    isDone,
    options,
  );
}

/**
 * GET /me/follow-requests, /me/followers or /me/following: a page of the
 * account's own list, the latest first; `cursor` is the `next` of the page
 * before.
 */
export function fetchFollowList(
  baseUrl: string,
  token: string,
  list: FollowList,
  cursor: string | null = null,
  options: Options = {},
): Promise<AccountOutcome<PeoplePage>> {
  const query = cursor === null ? "" : `?cursor=${encodeURIComponent(cursor)}`;
  return ask(
    baseUrl,
    `${LIST_PATHS[list]}${query}`,
    { method: "GET", token },
    isPeoplePage,
    options,
  );
}

/**
 * POST /me/follow-requests/{public_id}/accept or /decline. A request
 * declined is deleted: who asked is never told.
 */
export function answerFollowRequest(
  baseUrl: string,
  token: string,
  publicId: string,
  answer: "accept" | "decline",
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(
    baseUrl,
    `${LIST_PATHS.requests}/${encodeURIComponent(publicId)}/${answer}`,
    { method: "POST", token },
    isDone,
    options,
  );
}

/** DELETE /me/followers/{public_id}: that member follows the account no more. */
export function removeFollower(
  baseUrl: string,
  token: string,
  publicId: string,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(
    baseUrl,
    `${LIST_PATHS.followers}/${encodeURIComponent(publicId)}`,
    { method: "DELETE", token },
    isDone,
    options,
  );
}

function isDone(body: unknown, status: number): body is null {
  return status === 204 && body === null;
}

export function isFollow(body: unknown): body is Follow {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { follow } = body as Record<string, unknown>;
  return follow !== "none" && FOLLOW_STATES.some((state) => state === follow);
}

export function isPeoplePage(body: unknown): body is PeoplePage {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const page = body as Record<string, unknown>;
  return (
    Array.isArray(page.people) &&
    page.people.every(isPerson) &&
    (page.next === null || typeof page.next === "string") &&
    typeof page.total === "number"
  );
}

type Failed = Exclude<AccountOutcome<unknown>, { kind: "ok" }>;

/** A request about following that failed, in words. */
export function followProblem(failed: Failed): string {
  // The member's account is gone, or the API is older than TASK-211.
  if (failed.kind === "api_error" && failed.code === "http_error") {
    return t("This profile is not available.");
  }
  return accountProblem(failed);
}
