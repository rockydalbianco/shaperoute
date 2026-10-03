import {
  BIO_MAX_LENGTH,
  type EditProfileRequest,
  type User,
} from "@shaperoute/shared-types";

import { type Checked, usernameProblem } from "../account/fields";
import { accountProblem } from "../account/messages";
import type { AccountOutcome } from "../api/accounts";
import { t, tLater } from "../i18n";

/** What «Edit profile» holds while it is written (TASK-116). */
export type ProfileFields = { username: string; bio: string };

type Failed = Exclude<AccountOutcome<unknown>, { kind: "ok" }>;

/** An API older than TASK-116 has no PATCH /me. In English: shown with `t()`. */
export const NO_PROFILE_EDITS = tLater(
  "Editing the profile is not available on this API yet.",
);

/**
 * The length of a bio as the API counts it: characters, so an emoji is one
 * (a JavaScript string counts it as two).
 */
export function bioLength(bio: string): number {
  return [...bio].length;
}

/** The bio of an account; an API older than TASK-116 has none. */
export function bioOf(user: User): string {
  return user.bio ?? "";
}

/**
 * The fields checked with the API's rules, and only what changed; `null`
 * when nothing did, and nothing needs asking.
 */
export function checkProfile(
  fields: ProfileFields,
  user: User,
): Checked<EditProfileRequest | null> {
  const username = fields.username.trim();
  const bio = fields.bio.trim();
  const problem =
    usernameProblem(username) ??
    (bioLength(bio) > BIO_MAX_LENGTH
      ? t("A bio is at most {max} characters.", { max: BIO_MAX_LENGTH })
      : null);
  if (problem !== null) {
    return { ok: false, problem };
  }
  const changes: EditProfileRequest = {
    ...(username !== user.username ? { username } : {}),
    ...(bio !== bioOf(user) ? { bio } : {}),
  };
  return { ok: true, request: Object.keys(changes).length > 0 ? changes : null };
}

/** A change of the profile that failed, in words (docs/UI.md, «Profile»). */
export function profileProblem(failed: Failed): string {
  if (failed.kind === "api_error") {
    // PATCH /me says what is wrong with a value in words, for people.
    if (failed.code === "invalid_request") {
      return failed.message;
    }
    if (failed.code === "http_error") {
      return t(NO_PROFILE_EDITS);
    }
  }
  return accountProblem(failed);
}
