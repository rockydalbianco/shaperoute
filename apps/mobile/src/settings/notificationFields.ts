import type { Notifications, User } from "@shaperoute/shared-types";

import { accountProblem } from "../account/messages";
import type { AccountOutcome } from "../api/accounts";
import { t, tLater } from "../i18n";

/**
 * What the two notification switches of «Settings» read and say
 * (TASK-185, ADR-0206, docs/API.md, «Notifications»).
 */

type Failed = Exclude<AccountOutcome<unknown>, { kind: "ok" }>;

/** An API older than TASK-185 has no PUT /me/notifications. Shown with `t()`. */
export const NO_NOTIFICATIONS = tLater(
  "Notifications are not available on this API yet.",
);

/** Both off: an account that never touched its switches. */
const OFF: Notifications = { email: false, push: false };

/** The switches of an account; an API older than TASK-185 tells none: off. */
export function notificationsOf(user: User): Notifications {
  return user.notifications ?? OFF;
}

/** A switch that could not be kept, in words (docs/UI.md), as a change of
 * email or phone number says it (`contactProblem`). */
export function notificationsProblem(failed: Failed): string {
  if (failed.kind === "api_error" && failed.code === "http_error") {
    return t(NO_NOTIFICATIONS);
  }
  return accountProblem(failed);
}
