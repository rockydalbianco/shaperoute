import {
  PASSWORD_LENGTH,
  type SignInRequest,
  type SignUpRequest,
} from "@shaperoute/shared-types";

/**
 * What the forms check before asking the API (TASK-115): the same rules as
 * the API's (docs/API.md, «Account»), so a mistake is told in words at once
 * instead of coming back as a bug.
 */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const USERNAME = /^[A-Za-z0-9_.]{3,20}$/;
const MAX_EMAIL_LENGTH = 254;

export type SignUpFields = {
  email: string;
  username: string;
  password: string;
  atLeast16: boolean;
};

export type SignInFields = { email: string; password: string };

export type Checked<T> = { ok: true; request: T } | { ok: false; problem: string };

export function checkSignUp(fields: SignUpFields): Checked<SignUpRequest> {
  const email = fields.email.trim();
  const username = fields.username.trim();
  const problem =
    emailProblem(email) ??
    usernameProblem(username) ??
    passwordProblem(fields.password) ??
    (fields.atLeast16 ? null : "You must be at least 16 to sign up.");
  return problem === null
    ? {
        ok: true,
        request: {
          email,
          password: fields.password,
          username,
          at_least_16: true,
        },
      }
    : { ok: false, problem };
}

export function checkSignIn(fields: SignInFields): Checked<SignInRequest> {
  const email = fields.email.trim();
  if (email === "") {
    return { ok: false, problem: "Enter the email of your account." };
  }
  if (fields.password === "") {
    return { ok: false, problem: "Enter your password." };
  }
  return { ok: true, request: { email, password: fields.password } };
}

/** The rule of a username, at sign-up and in «Edit profile» (TASK-116). */
export function usernameProblem(username: string): string | null {
  return USERNAME.test(username)
    ? null
    : "A username is 3 to 20 letters, digits, _ or . (no spaces).";
}

function emailProblem(email: string): string | null {
  return EMAIL.test(email) && email.length <= MAX_EMAIL_LENGTH
    ? null
    : "Enter an email address, like name@example.com.";
}

function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_LENGTH.min) {
    return `A password is at least ${PASSWORD_LENGTH.min} characters.`;
  }
  if (password.length > PASSWORD_LENGTH.max) {
    return `A password is at most ${PASSWORD_LENGTH.max} characters.`;
  }
  return null;
}
