import type { AccountOutcome } from "../api/accounts";
import { t, tLater } from "../i18n";

/** A request that did not go as asked, in plain words (docs/UI.md). */
type Failed = Exclude<AccountOutcome<unknown>, { kind: "ok" }>;

/**
 * An app built without the address of its service (TASK-256): on a phone,
 * only one older than the service. In English: where it is shown,
 * `t(NO_API)` (TASK-210).
 */
export const NO_API = tLater("The app cannot reach the service. Update the app.");

/**
 * The session is over (`session_expired`, `not_signed_in`): log in again.
 * In English: where it is shown, `t(SESSION_ENDED)` (TASK-210).
 */
export const SESSION_ENDED = tLater("Your session has ended. Log in again.");

/**
 * Something the app did not expect from the API, for whoever uses the
 * phone: nothing to do but try again. `detail` (an address, a status, the
 * API's words) follows only in a development build (TASK-256).
 */
function ourSide(detail: string): string {
  return withDetail(
    t("Something went wrong on our side. Try again in a moment."),
    detail,
  );
}

/** `text`, and `detail` after it in a development build. */
export function withDetail(text: string, detail: string): string {
  return __DEV__ ? `${text} (${detail})` : text;
}

/** An account request that failed, in words. */
export function accountProblem(failed: Failed): string {
  switch (failed.kind) {
    case "unreachable":
      return withDetail(
        t("No connection. Check the network and try again."),
        `Cannot reach the API at ${failed.url}.`,
      );
    case "bad_answer":
      return ourSide(`unexpected answer, HTTP ${failed.status}`);
    case "api_error":
      switch (failed.code) {
        case "email_taken":
          return t("This email already has an account. Log in instead.");
        case "username_taken":
          return t("This username is taken. Try another one.");
        case "wrong_credentials":
          return t("Wrong email or password.");
        case "too_many_requests":
          return tooManyTries(failed.retryAfterS);
        case "session_expired":
        case "not_signed_in":
          return t(SESSION_ENDED);
        case "accounts_unavailable":
          return t("Accounts are not available right now. Try again later.");
        // A key refused is an app older than its service (TASK-081).
        case "unauthorized":
          return t("This version of the app is no longer allowed in. Update the app.");
        default:
          return ourSide(`${failed.code}: ${failed.message}`);
      }
  }
}

/** True when the API says the token no longer opens a session. */
export function sessionEnded(outcome: AccountOutcome<unknown>): boolean {
  return (
    outcome.kind === "api_error" &&
    (outcome.code === "session_expired" || outcome.code === "not_signed_in")
  );
}

function tooManyTries(seconds: number | null): string {
  if (seconds === null || seconds <= 60) {
    return t("Too many tries. Wait a minute and try again.");
  }
  // Always 2 or more: «minutes» in each language.
  return t("Too many tries. Wait {minutes} minutes and try again.", {
    minutes: Math.ceil(seconds / 60),
  });
}
