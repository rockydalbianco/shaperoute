import session from "@shaperoute/shared-types/fixtures/session.json";
import { BIO_MAX_LENGTH, type User } from "@shaperoute/shared-types";

import {
  bioLength,
  bioOf,
  checkProfile,
  NO_PROFILE_EDITS,
  profileProblem,
} from "./profileFields";

const user: User = { ...(session.user as User), bio: "Hearts." };
const RULE = "A username is 3 to 20 letters, digits, _ or . (no spaces).";

test("only what changed is sent, and nothing when nothing did", () => {
  expect(checkProfile({ username: "Runner_42", bio: "Hearts." }, user)).toEqual({
    ok: true,
    request: null,
  });
  expect(checkProfile({ username: " Ada_runs ", bio: "Hearts." }, user)).toEqual({
    ok: true,
    request: { username: "Ada_runs" },
  });
  expect(checkProfile({ username: "Runner_42", bio: " Stars.\n" }, user)).toEqual({
    ok: true,
    request: { bio: "Stars." },
  });
  expect(checkProfile({ username: "Ada", bio: "" }, user)).toEqual({
    ok: true,
    request: { username: "Ada", bio: "" },
  });
});

test("an account from an API without bios has an empty one", () => {
  const { bio: _bio, ...before } = user;
  expect(bioOf(before)).toBe("");
  expect(checkProfile({ username: "Runner_42", bio: "" }, before)).toEqual({
    ok: true,
    request: null,
  });
});

test("a username out of the rule is told before asking", () => {
  for (const username of ["ab", "two words", "a".repeat(21), "dash-ed", ""]) {
    expect(checkProfile({ username, bio: "" }, user)).toEqual({
      ok: false,
      problem: RULE,
    });
  }
});

test("a bio is counted in characters, as the API counts them", () => {
  expect(bioLength("🏃🏃")).toBe(2);
  const full = "🏃".repeat(BIO_MAX_LENGTH);
  expect(checkProfile({ username: "Runner_42", bio: full }, user)).toEqual({
    ok: true,
    request: { bio: full },
  });
  expect(checkProfile({ username: "Runner_42", bio: `${full}a` }, user)).toEqual({
    ok: false,
    problem: "A bio is at most 160 characters.",
  });
});

test("a change that failed is said in words", () => {
  const error = { retryAfterS: null, suggested_distance_m: null, reason: null };
  expect(
    profileProblem({
      kind: "api_error",
      code: "invalid_request",
      message: "A bio is at most 160 characters.",
      ...error,
    }),
  ).toBe("A bio is at most 160 characters.");
  expect(
    profileProblem({
      kind: "api_error",
      code: "username_taken",
      message: "…",
      ...error,
    }),
  ).toBe("This username is taken. Try another one.");
  // An API older than TASK-116 has no PATCH /me.
  expect(
    profileProblem({
      kind: "api_error",
      code: "http_error",
      message: "Method Not Allowed",
      ...error,
    }),
  ).toBe(NO_PROFILE_EDITS);
  expect(profileProblem({ kind: "unreachable", url: "http://api" })).toBe(
    "Cannot reach the API at http://api. Check the connection and try again.",
  );
});
