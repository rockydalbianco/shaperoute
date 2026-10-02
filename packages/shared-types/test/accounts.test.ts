import assert from "node:assert/strict";
import { test } from "node:test";

import session from "../fixtures/session.json" with { type: "json" };
import signUp from "../fixtures/sign-up-request.json" with { type: "json" };
import {
  PASSWORD_LENGTH,
  USER_ROLES,
  type Session,
  type SignInRequest,
  type SignUpRequest,
} from "../src/index.ts";

// The same JSON is validated by the API's test_accounts.py (TASK-114).
const signUpRequest: SignUpRequest = signUp;
const signedIn: Session = { ...session, user: { ...session.user, role: "user" } };

test("the sign-up example keeps the API's limits", () => {
  assert.ok(signUpRequest.password.length >= PASSWORD_LENGTH.min);
  assert.ok(signUpRequest.password.length <= PASSWORD_LENGTH.max);
  assert.match(signUpRequest.username, /^[A-Za-z0-9_.]{3,20}$/);
  assert.equal(signUpRequest.at_least_16, true);
});

test("a session carries the token and the user, nothing else", () => {
  assert.deepEqual(Object.keys(signedIn).sort(), ["token", "user"]);
  assert.deepEqual(Object.keys(signedIn.user).sort(), [
    "created_at",
    "email",
    "id",
    "role",
    "username",
  ]);
  assert.ok(USER_ROLES.includes(signedIn.user.role));
  const signIn: SignInRequest = { email: signUp.email, password: signUp.password };
  assert.equal(signIn.email, signedIn.user.email);
});
