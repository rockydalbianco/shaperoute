import type {
  ChangeEmailRequest,
  ChangePhoneRequest,
  User,
} from "@shaperoute/shared-types";

import { type AccountOutcome, ask, isUser } from "./accounts";

/**
 * How an account is reached (TASK-183, docs/API.md, «Email and phone
 * number»): PUT /me/email changes the address with the password of the
 * account, PUT /me/phone keeps a phone number or takes it away. Both with
 * the session token; the answer is the account as the API keeps it now.
 * An API older than TASK-183 has neither: `http_error`.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

/** PUT /me/email: the new address holds at once. */
export function changeEmail(
  baseUrl: string,
  token: string,
  request: ChangeEmailRequest,
  options: Options = {},
): Promise<AccountOutcome<User>> {
  return ask(
    baseUrl,
    "/me/email",
    { method: "PUT", body: request, token },
    isUser,
    options,
  );
}

/** PUT /me/phone: the number with its country code; null takes it away. */
export function changePhone(
  baseUrl: string,
  token: string,
  request: ChangePhoneRequest,
  options: Options = {},
): Promise<AccountOutcome<User>> {
  return ask(
    baseUrl,
    "/me/phone",
    { method: "PUT", body: request, token },
    isUser,
    options,
  );
}
