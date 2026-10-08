import codes from "@shaperoute/shared-types/fixtures/api-error-codes.json";
import type { ApiErrorCode } from "@shaperoute/shared-types";

import { accountProblem, SESSION_ENDED, sessionEnded, withDetail } from "./messages";

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
  ["accounts_unavailable", "Accounts are not available right now. Try again later."],
  ["unauthorized", "This version of the app is no longer allowed in. Update the app."],
  // The code and the API's words follow for the developer: under jest, as
  // in a development build.
  [
    "invalid_request",
    "Something went wrong on our side. Try again in a moment. (invalid_request: the API's words)",
  ],
] as const)("%s says: %s", (code, text) => {
  expect(accountProblem(failed(code))).toBe(text);
});

/** Words for the developer, never for whoever uses the phone (TASK-256). */
const DEVELOPER_WORDS = /http|\.env|npm|Ollama|--lan|API log|bug/i;

test("no text for the user has a developer's words in it", () => {
  const dev = __DEV__;
  (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;
  try {
    for (const code of codes as ApiErrorCode[]) {
      expect(accountProblem(failed(code))).not.toMatch(DEVELOPER_WORDS);
    }
    expect(accountProblem({ kind: "unreachable", url: "http://10.0.0.2:8000" })).toBe(
      "No connection. Check the network and try again.",
    );
    expect(accountProblem({ kind: "bad_answer", status: 502 })).toBe(
      "Something went wrong on our side. Try again in a moment.",
    );
    expect(withDetail("Words.", "HTTP 502")).toBe("Words.");
  } finally {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = dev;
  }
  expect(withDetail("Words.", "HTTP 502")).toBe("Words. (HTTP 502)");
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

test("no API, or an answer out of the contract: the address and the status for the developer", () => {
  expect(accountProblem({ kind: "unreachable", url: "http://10.0.0.2:8000" })).toBe(
    "No connection. Check the network and try again. (Cannot reach the API at http://10.0.0.2:8000.)",
  );
  expect(accountProblem({ kind: "bad_answer", status: 502 })).toBe(
    "Something went wrong on our side. Try again in a moment. (unexpected answer, HTTP 502)",
  );
});

test("only an expired or closed session ends the one on the phone", () => {
  expect(sessionEnded(failed("session_expired"))).toBe(true);
  expect(sessionEnded(failed("not_signed_in"))).toBe(true);
  expect(sessionEnded(failed("wrong_credentials"))).toBe(false);
  expect(sessionEnded({ kind: "unreachable", url: "x" })).toBe(false);
  expect(sessionEnded({ kind: "ok", value: null })).toBe(false);
});
