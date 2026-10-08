import session from "@shaperoute/shared-types/fixtures/session.json";
import type { ApiErrorCode, User } from "@shaperoute/shared-types";

import {
  checkEmailChange,
  checkPhone,
  contactProblem,
  NO_EMAIL_CHANGE,
  NO_PHONE,
  phoneOf,
  phoneOfUser,
} from "./contactFields";

const user = session.user as User;
const PHONE = "+393331234567";
const PHONE_RULE = "Write the number with its country code, like +39 333 123 4567.";

function refused(code: ApiErrorCode, message = "…") {
  return {
    kind: "api_error" as const,
    retryAfterS: null,
    code,
    message,
    suggested_distance_m: null,
  };
}

test("a new email goes with the password, without the spaces around it", () => {
  expect(
    checkEmailChange({ email: " new@example.com ", password: "the password" }, user),
  ).toEqual({
    ok: true,
    request: { email: "new@example.com", password: "the password" },
  });
});

test.each([
  ["", "pw", "Enter an email address, like name@example.com."],
  ["not an email", "pw", "Enter an email address, like name@example.com."],
  ["Runner@Example.com", "pw", "This is already the email of your account."],
  ["new@example.com", "", "Enter your password."],
])("«%s» with «%s» is told in words", (email, password, problem) => {
  expect(checkEmailChange({ email, password }, user)).toEqual({ ok: false, problem });
});

test.each([
  "+393331234567",
  "+39 333 123 4567",
  "+39 333-123-4567",
  "+39 (333) 123.4567",
  "0039 333 1234567",
  " +39/333/1234567 ",
])("«%s» is one number, as the API keeps it", (written) => {
  expect(phoneOf(written)).toBe(PHONE);
  expect(checkPhone(written)).toEqual({ ok: true, request: { phone: PHONE } });
});

test.each([
  "333 123 4567",
  "+0393331234567",
  "+1234567",
  "+1234567890123456",
  "+39 333 12E 4567",
  "++393331234567",
  "call me",
])("«%s» is not a number with its country code", (written) => {
  expect(phoneOf(written)).toBeNull();
  expect(checkPhone(written)).toEqual({ ok: false, problem: PHONE_RULE });
});

test("nothing written takes the number away", () => {
  expect(checkPhone("")).toEqual({ ok: true, request: { phone: null } });
  expect(checkPhone("   ")).toEqual({ ok: true, request: { phone: null } });
});

test("an account has its number, none, or comes from an API without numbers", () => {
  expect(phoneOfUser({ ...user, phone: PHONE })).toBe(PHONE);
  expect(phoneOfUser({ ...user, phone: null })).toBeNull();
  const { phone: _phone, ...before } = { ...user, phone: PHONE };
  expect(phoneOfUser(before)).toBeNull();
});

test("what the API refuses is said in words", () => {
  expect(contactProblem(refused("wrong_credentials"), "email")).toBe("Wrong password.");
  expect(contactProblem(refused("email_taken"), "email")).toBe(
    "Another account has this email.",
  );
  // The API's own words for a value out of its rule.
  expect(contactProblem(refused("invalid_request", PHONE_RULE), "phone")).toBe(
    PHONE_RULE,
  );
  // An API older than TASK-183 has neither endpoint.
  expect(contactProblem(refused("http_error", "Not Found"), "email")).toBe(
    NO_EMAIL_CHANGE,
  );
  expect(contactProblem(refused("http_error", "Not Found"), "phone")).toBe(NO_PHONE);
  // The rest as every account request says it.
  expect(contactProblem(refused("too_many_requests"), "email")).toBe(
    "Too many tries. Wait a minute and try again.",
  );
  expect(contactProblem({ kind: "unreachable", url: "http://api" }, "phone")).toBe(
    "No connection. Check the network and try again. (Cannot reach the API at http://api.)",
  );
});
