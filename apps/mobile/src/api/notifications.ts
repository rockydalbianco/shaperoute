import type { NotificationsRequest, User } from "@shaperoute/shared-types";

import { type AccountOutcome, ask, isUser } from "./accounts";

/**
 * The two notification switches of an account (TASK-185, docs/API.md,
 * «Notifications»): PUT /me/notifications keeps what is sent, one switch
 * or both, with the session token; the answer is the account as the API
 * keeps it now. Nothing is sent to anyone yet: the choice is only kept.
 * An API older than TASK-185 has no such endpoint: `http_error`.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

/** PUT /me/notifications: only what changes. */
export function changeNotifications(
  baseUrl: string,
  token: string,
  request: NotificationsRequest,
  options: Options = {},
): Promise<AccountOutcome<User>> {
  return ask(
    baseUrl,
    "/me/notifications",
    { method: "PUT", body: request, token },
    isUser,
    options,
  );
}
