import assert from "node:assert/strict";
import { test } from "node:test";

import editProfile from "../fixtures/edit-profile-request.json" with { type: "json" };
import publicProfile from "../fixtures/public-profile.json" with { type: "json" };
import session from "../fixtures/session.json" with { type: "json" };
import signUp from "../fixtures/sign-up-request.json" with { type: "json" };
import {
  BIO_MAX_LENGTH,
  type EditProfileRequest,
  PASSWORD_LENGTH,
  type PublicProfile,
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
    "bio",
    "created_at",
    "email",
    "id",
    "public_id",
    "role",
    "username",
  ]);
  assert.ok(USER_ROLES.includes(signedIn.user.role));
  const signIn: SignInRequest = { email: signUp.email, password: signUp.password };
  assert.equal(signIn.email, signedIn.user.email);
});

// The same JSON is validated by the API's test_profiles.py (TASK-116).
const edited: EditProfileRequest = editProfile;
const seen: PublicProfile = { ...publicProfile, follow: "following" };

test("the profile change keeps the API's limits", () => {
  assert.match(edited.username ?? "", /^[A-Za-z0-9_.]{3,20}$/);
  assert.ok([...(edited.bio ?? "")].length <= BIO_MAX_LENGTH);
});

test("a profile seen by the others has no email, role or internal id", () => {
  assert.deepEqual(Object.keys(seen).sort(), [
    "bio",
    "drawings",
    "follow",
    "followers",
    "following",
    "photo",
    "public_id",
    "username",
  ]);
  assert.equal(seen.public_id, signedIn.user.public_id);
});
