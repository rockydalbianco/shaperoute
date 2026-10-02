import codes from "@shaperoute/shared-types/fixtures/api-error-codes.json";
import type { ApiErrorCode } from "@shaperoute/shared-types";

import { accountProblem, SESSION_ENDED, sessionEnded } from "./messages";

function failed(code: ApiErrorCode, retryAfterS: number | null = null) {
  return {
    kind: "api_error" as const,
    code,
    message: "the API's words",
    suggested_distance_m: null,
    reason: null,
    retryAfterS,
  };
}

test.each([
  ["email_taken", "This email already has an account. Log in instead."],
  ["username_taken", "This username is taken. Try another one."],
  ["wrong_credentials", "Wrong email or password."],
  ["session_expired", SESSION_ENDED],
  ["not_signed_in", SESSION_ENDED],
  [
    "accounts_unavailable",
    "Accounts are not available on this API: it has no database.",
  ],
  ["invalid_request", "The app and the API do not agree (a bug): the API's words"],
] as const)("%s says: %s", (code, text) => {
  expect(accountProblem(failed(code))).toBe(text);
});

test("too many tries says how long to wait, in minutes", () => {
  expect(accountProblem(failed("too_many_requests", 600))).toBe(
    "Too many tries. Wait 10 minutes and try again.",
  );
  expect(accountProblem(failed("too_many_requests", 61))).toBe(
    "Too many tries. Wait 2 minutes and try again.",
  );
  expect(accountProblem(failed("too_many_requests", 30))).toBe(
    "Too many tries. Wait a minute and try again.",
  );
  expect(accountProblem(failed("too_many_requests"))).toBe(
    "Too many tries. Wait a minute and try again.",
  );
});

test("every code of the contract has words, and none is empty", () => {
  for (const code of codes as ApiErrorCode[]) {
    expect(accountProblem(failed(code))).not.toBe("");
  }
});

test("no API, or an answer out of the contract", () => {
  expect(accountProblem({ kind: "unreachable", url: "http://10.0.0.2:8000" })).toBe(
    "Cannot reach the API at http://10.0.0.2:8000. Check the connection and try again.",
  );
  expect(accountProblem({ kind: "bad_answer", status: 502 })).toBe(
    "The app and the API do not agree (a bug): HTTP 502.",
  );
});

test("only an expired or closed session ends the one on the phone", () => {
  expect(sessionEnded(failed("session_expired"))).toBe(true);
  expect(sessionEnded(failed("not_signed_in"))).toBe(true);
  expect(sessionEnded(failed("wrong_credentials"))).toBe(false);
  expect(sessionEnded({ kind: "unreachable", url: "x" })).toBe(false);
  expect(sessionEnded({ kind: "ok", value: null })).toBe(false);
});
