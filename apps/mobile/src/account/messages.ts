import type { AccountOutcome } from "../api/accounts";

/** A request that did not go as asked, in plain words (docs/UI.md). */
type Failed = Exclude<AccountOutcome<unknown>, { kind: "ok" }>;

const BUG = "The app and the API do not agree (a bug)";

export const NO_API =
  "The app does not know where the API is: open it from the QR code of npm run mobile on the PC.";

/** The session is over (`session_expired`, `not_signed_in`): log in again. */
export const SESSION_ENDED = "Your session has ended. Log in again.";

/** An account request that failed, in words. */
export function accountProblem(failed: Failed): string {
  switch (failed.kind) {
    case "unreachable":
      return `Cannot reach the API at ${failed.url}. Check the connection and try again.`;
    case "bad_answer":
      return `${BUG}: HTTP ${failed.status}.`;
    case "api_error":
      switch (failed.code) {
        case "email_taken":
          return "This email already has an account. Log in instead.";
        case "username_taken":
          return "This username is taken. Try another one.";
        case "wrong_credentials":
          return "Wrong email or password.";
        case "too_many_requests":
          return `Too many tries. ${waitText(failed.retryAfterS)}`;
        case "session_expired":
        case "not_signed_in":
          return SESSION_ENDED;
        case "accounts_unavailable":
          return "Accounts are not available on this API: it has no database.";
        case "unauthorized":
          return "The API refused the app's key (EXPO_PUBLIC_API_KEY in apps/mobile/.env).";
        default:
          return `${BUG}: ${failed.message}`;
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

function waitText(seconds: number | null): string {
  if (seconds === null || seconds <= 60) {
    return "Wait a minute and try again.";
  }
  return `Wait ${Math.ceil(seconds / 60)} minutes and try again.`;
}
