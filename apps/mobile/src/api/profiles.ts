import type { EditProfileRequest, PublicProfile, User } from "@shaperoute/shared-types";

import { type AccountOutcome, ask, isUser } from "./accounts";

/**
 * The profile (TASK-116, docs/API.md, «Profile»): PATCH /me changes the
 * username and the bio of the account, GET /users/{public_id} is another
 * member's profile. Both with the session token.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

/**
 * PATCH /me: only what changes. The answer is the account as the API keeps
 * it now. An API older than TASK-116 has no PATCH: `http_error`.
 */
export function editProfile(
  baseUrl: string,
  token: string,
  changes: EditProfileRequest,
  options: Options = {},
): Promise<AccountOutcome<User>> {
  return ask(
    baseUrl,
    "/me",
    { method: "PATCH", body: changes, token },
    isUser,
    options,
  );
}

/**
 * GET /users/{public_id}: someone's profile as every member sees it. Unknown,
 * or an API older than TASK-116: `http_error` 404.
 */
export function fetchProfile(
  baseUrl: string,
  token: string,
  publicId: string,
  options: Options = {},
): Promise<AccountOutcome<PublicProfile>> {
  return ask(
    baseUrl,
    `/users/${encodeURIComponent(publicId)}`,
    { method: "GET", token },
    isPublicProfile,
    options,
  );
}

/** The picture of a profile as an `Image` shows it; null without one. */
export function profilePhotoUri(profile: PublicProfile): string | null {
  return profile.photo === null ? null : `data:image/jpeg;base64,${profile.photo}`;
}

export function isPublicProfile(body: unknown): body is PublicProfile {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const profile = body as Record<string, unknown>;
  return (
    typeof profile.public_id === "string" &&
    typeof profile.username === "string" &&
    typeof profile.bio === "string" &&
    (profile.photo === null || typeof profile.photo === "string") &&
    typeof profile.drawings === "number"
  );
}
