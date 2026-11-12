import type {
  LiveShare,
  LiveShareCreated,
  LiveShareMade,
  LiveShareRequest,
  LiveShareSent,
  LiveUpdate,
  LiveView,
} from "@shaperoute/shared-types";

import { authHeaders } from "../api/accounts";
import { apiKey, keyHeaders } from "../api/apiUrl";

/**
 * The three requests of «Share live» (TASK-424 part B1, ADR-0352;
 * docs/API.md «Live shares»): make the link, send what is new, stop it.
 * All with the session token. Only `fetch`: no new dependency.
 */

/** How a request ended, as the sender needs it. */
export type LiveAnswer<T> =
  | { kind: "ok"; value: T }
  /** 410, 404 or 401: the link is over, or no longer this account's. */
  | { kind: "ended" }
  /** Another 4xx (a 422 for points out of time): sending it again changes
   * nothing. */
  | { kind: "rejected"; status: number }
  /** No network, a 5xx or a 429: the same can go again later. */
  | { kind: "retry"; status: number | null };

export type LiveApiOptions = {
  baseUrl: string;
  token: string;
  fetchFn?: typeof fetch;
  key?: string | null;
};

/** An update is small and comes again in 15 s: it never waits longer. */
export const UPDATE_TIMEOUT_MS = 10_000;
/** Making the link: the runner waits for it with the sheet open. */
export const CREATE_TIMEOUT_MS = 20_000;

async function send<T>(
  { baseUrl, token, fetchFn = fetch, key = apiKey() }: LiveApiOptions,
  method: "GET" | "POST" | "DELETE",
  path: string,
  body: unknown,
  timeoutMs: number,
  accept: (answer: unknown) => answer is T,
): Promise<LiveAnswer<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let status: number;
  let answer: unknown = null;
  try {
    const response = await fetchFn(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...keyHeaders(key),
        ...authHeaders(token),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    status = response.status;
    if (response.ok && status !== 204) {
      answer = await response.json().catch(() => undefined);
    }
  } catch {
    return { kind: "retry", status: null };
  } finally {
    clearTimeout(timer);
  }
  if (status >= 200 && status < 300) {
    return accept(answer) ? { kind: "ok", value: answer } : { kind: "retry", status };
  }
  if (status === 410 || status === 404 || status === 401) {
    return { kind: "ended" };
  }
  if (status === 429 || status >= 500) {
    return { kind: "retry", status };
  }
  return { kind: "rejected", status };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCreated(value: unknown): value is LiveShareCreated {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.url === "string" &&
    value.url !== ""
  );
}

/** A share made without its link (TASK-468): `url` is null. */
function isMade(value: unknown): value is LiveShareMade {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.url === null || (typeof value.url === "string" && value.url !== ""))
  );
}

function isSent(value: unknown): value is LiveShareSent {
  return isRecord(value) && Array.isArray(value.sent) && Array.isArray(value.skipped);
}

function isView(value: unknown): value is LiveView {
  return (
    isRecord(value) && typeof value.status === "string" && Array.isArray(value.points)
  );
}

function isShare(value: unknown): value is LiveShare {
  return isRecord(value) && typeof value.status === "string";
}

function isNothing(value: unknown): value is null {
  return value === null;
}

/** POST /me/live-shares: the new link, its token in `url`. */
export function createLiveShare(
  options: LiveApiOptions,
  request: LiveShareRequest,
): Promise<LiveAnswer<LiveShareCreated>> {
  return send(
    options,
    "POST",
    "/me/live-shares",
    request,
    CREATE_TIMEOUT_MS,
    isCreated,
  );
}

/** POST /me/live-shares/{id}/updates: the new points and the numbers. */
export function sendLiveUpdate(
  options: LiveApiOptions,
  id: string,
  update: LiveUpdate,
): Promise<LiveAnswer<LiveShare>> {
  return send(
    options,
    "POST",
    `/me/live-shares/${encodeURIComponent(id)}/updates`,
    update,
    UPDATE_TIMEOUT_MS,
    isShare,
  );
}

/** DELETE /me/live-shares/{id}: the link stops, its points go. */
export function stopLiveShareRequest(
  options: LiveApiOptions,
  id: string,
): Promise<LiveAnswer<null>> {
  return send(
    options,
    "DELETE",
    `/me/live-shares/${encodeURIComponent(id)}`,
    undefined,
    UPDATE_TIMEOUT_MS,
    isNothing,
  );
}

/** POST /me/live-shares with `link` and `heart_visible` (TASK-468): a share
 * made only for the chat has no link, `url` null. */
export function createLiveShareMade(
  options: LiveApiOptions,
  request: LiveShareRequest,
): Promise<LiveAnswer<LiveShareMade>> {
  return send(options, "POST", "/me/live-shares", request, CREATE_TIMEOUT_MS, isMade);
}

/** POST /me/live-shares/{id}/link: its link, made now (a new token). */
export function makeLiveLink(
  options: LiveApiOptions,
  id: string,
): Promise<LiveAnswer<LiveShareCreated>> {
  return send(
    options,
    "POST",
    `/me/live-shares/${encodeURIComponent(id)}/link`,
    undefined,
    CREATE_TIMEOUT_MS,
    isCreated,
  );
}

/** POST /me/live-shares/{id}/send: «Send in MuW», a message to each
 * person (TASK-468 part A1b). */
export function sendLiveShareTo(
  options: LiveApiOptions,
  id: string,
  publicIds: string[],
): Promise<LiveAnswer<LiveShareSent>> {
  return send(
    options,
    "POST",
    `/me/live-shares/${encodeURIComponent(id)}/send`,
    { to: publicIds },
    CREATE_TIMEOUT_MS,
    isSent,
  );
}

/** GET /live-shares/{id}?after=: what a signed-in viewer sees (TASK-468).
 * «ended» (404, 401) for one it may not see, or gone. */
export function fetchLiveView(
  options: LiveApiOptions,
  id: string,
  after: number,
): Promise<LiveAnswer<LiveView>> {
  return send(
    options,
    "GET",
    `/live-shares/${encodeURIComponent(id)}?after=${after}`,
    undefined,
    UPDATE_TIMEOUT_MS,
    isView,
  );
}
