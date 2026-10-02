import { type AccountOutcome, ask } from "./accounts";

/**
 * The profile picture of the account (TASK-178): GET, PUT and DELETE
 * /me/photo, all with the session token (docs/API.md, «Profile picture»).
 * The body is packages/shared-types/fixtures/profile-photo.json; the type
 * lives here, like `Favorite`.
 */

/** The picture as the API keeps it: a small square JPEG. */
export type ProfilePhoto = {
  /** The JPEG in base64. */
  image: string;
  updated_at: string;
};

type Options = { fetchFn?: typeof fetch; key?: string | null };

/** What an `Image` shows: the JPEG itself, with nothing more to fetch. */
export function photoUri(photo: ProfilePhoto): string {
  return `data:image/jpeg;base64,${photo.image}`;
}

/**
 * GET /me/photo: the picture, or null when the account has none. An API
 * from before the pictures answers 404 as well: no picture there either.
 */
export function fetchPhoto(
  baseUrl: string,
  token: string,
  options: Options = {},
): Promise<AccountOutcome<ProfilePhoto | null>> {
  return ask(
    baseUrl,
    "/me/photo",
    { method: "GET", token },
    isProfilePhoto,
    options,
  ).then((outcome) =>
    outcome.kind === "api_error" && outcome.code === "http_error"
      ? { kind: "ok", value: null }
      : outcome,
  );
}

/**
 * PUT /me/photo: the picture chosen, as base64, in place of the one before.
 * The answer is the picture as the API kept it.
 */
export function savePhoto(
  baseUrl: string,
  token: string,
  base64: string,
  options: Options = {},
): Promise<AccountOutcome<ProfilePhoto>> {
  return ask(
    baseUrl,
    "/me/photo",
    { method: "PUT", body: { image: base64 }, token },
    isProfilePhoto,
    options,
  );
}

/** DELETE /me/photo: gone, or never there. */
export function removePhoto(
  baseUrl: string,
  token: string,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(baseUrl, "/me/photo", { method: "DELETE", token }, isEmpty, options);
}

function isEmpty(body: unknown, status: number): body is null {
  return status === 204 && body === null;
}

export function isProfilePhoto(body: unknown): body is ProfilePhoto {
  return (
    typeof body === "object" &&
    body !== null &&
    "image" in body &&
    typeof body.image === "string" &&
    body.image !== "" &&
    "updated_at" in body &&
    typeof body.updated_at === "string"
  );
}
