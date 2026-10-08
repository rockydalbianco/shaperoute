import type { PushTokenRequest } from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";

/**
 * This phone's push token on the API (TASK-262, docs/API.md, «Push
 * notifications»): PUT /me/push-token keeps it with the account of the
 * session, DELETE /me/push-token/{token} takes it back. Both answer 204.
 * An API older than TASK-262 has neither: `http_error`.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

function isNothing(body: unknown, status: number): body is null {
  return status === 204 && body === null;
}

/** PUT /me/push-token: the account of `token` is notified on this phone. */
export function keepPushToken(
  baseUrl: string,
  token: string,
  request: PushTokenRequest,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(
    baseUrl,
    "/me/push-token",
    { method: "PUT", body: request, token },
    isNothing,
    options,
  );
}

/** DELETE /me/push-token/{token}: this phone is notified no more. */
export function forgetPushToken(
  baseUrl: string,
  token: string,
  pushToken: string,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(
    baseUrl,
    `/me/push-token/${encodeURIComponent(pushToken)}`,
    { method: "DELETE", token },
    isNothing,
    options,
  );
}
