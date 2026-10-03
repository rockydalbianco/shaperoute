import type { AccountOutcome } from "../api/accounts";
import { t, tLater } from "../i18n";

/** A request that did not go as asked, in plain words (docs/UI.md). */
type Failed = Exclude<AccountOutcome<unknown>, { kind: "ok" }>;

/** In English: where it is shown, `t(NO_API)` (TASK-210). */
export const NO_API = tLater(
  "The app does not know where the API is: open it from the QR code of npm run mobile on the PC.",
);

/**
 * The session is over (`session_expired`, `not_signed_in`): log in again.
 * In English: where it is shown, `t(SESSION_ENDED)` (TASK-210).
 */
export const SESSION_ENDED = tLater("Your session has ended. Log in again.");

/** An account request that failed, in words. */
export function accountProblem(failed: Failed): string {
  switch (failed.kind) {
    case "unreachable":
      return t("Cannot reach the API at {url}. Check the connection and try again.", {
        url: failed.url,
      });
    case "bad_answer":
      return t("The app and the API do not agree (a bug): HTTP {status}.", {
        status: failed.status,
      });
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
          return t("Accounts are not available on this API: it has no database.");
        case "unauthorized":
          return t(
            "The API refused the app's key (EXPO_PUBLIC_API_KEY in apps/mobile/.env).",
          );
        default:
          return t("The app and the API do not agree (a bug): {message}", {
            message: failed.message,
          });
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
