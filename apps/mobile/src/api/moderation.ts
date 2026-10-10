import type { PeoplePage, ReportKind, ReportReason } from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";
import { isPeoplePage } from "./follows";

/**
 * Blocking and reporting (TASK-121, ADR-0228): the calls of docs/API.md,
 * «Block and report», all with the session token. A block keeps two
 * members apart both ways and ends every follow between them; a report is
 * kept for whoever runs the app. The request of a report is
 * packages/shared-types/fixtures/report-request.json; the list of those
 * blocked is a people-page.json.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

function blockPath(publicId: string): string {
  return `/users/${encodeURIComponent(publicId)}/block`;
}

/** PUT /users/{public_id}/block: blocked already, it stays so. */
export function blockMember(
  baseUrl: string,
  token: string,
  publicId: string,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(baseUrl, blockPath(publicId), { method: "PUT", token }, isDone, options);
}

/** DELETE /users/{public_id}/block: not blocked, nothing changes. */
export function unblockMember(
  baseUrl: string,
  token: string,
  publicId: string,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(
    baseUrl,
    blockPath(publicId),
    { method: "DELETE", token },
    isDone,
    options,
  );
}

/**
 * GET /me/blocked: a page of the members the account blocked, the last
 * first; `cursor` is the `next` of the page before.
 */
export function fetchBlocked(
  baseUrl: string,
  token: string,
  cursor: string | null = null,
  options: Options = {},
): Promise<AccountOutcome<PeoplePage>> {
  const query = cursor === null ? "" : `?cursor=${encodeURIComponent(cursor)}`;
  return ask(
    baseUrl,
    `/me/blocked${query}`,
    { method: "GET", token },
    isPeoplePage,
    options,
  );
}

/**
 * POST /reports: a drawing, a comment or a member, with a reason of the
 * short list. Reported again, the API keeps one with the latest reason.
 */
export function report(
  baseUrl: string,
  token: string,
  kind: ReportKind,
  id: string,
  reason: ReportReason,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(
    baseUrl,
    "/reports",
    { method: "POST", token, body: { kind, id, reason } },
    isDone,
    options,
  );
}

function isDone(body: unknown, status: number): body is null {
  return status === 204 && body === null;
}
