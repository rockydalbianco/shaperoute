import {
  type DrawingPhotoRequest,
  type MyPhotoPost,
  PHOTO_POST_VISIBILITIES,
  type PhotoPostRequest,
  type PhotoPostVisibility,
} from "@shaperoute/shared-types";

import { accountProblem, SESSION_ENDED } from "../account/messages";
import { t } from "../i18n";
import { type AccountOutcome, ask } from "./accounts";
import { isDrawingPhoto, isDrawingTag } from "./drawings";

/**
 * The posts of photos only of an account (TASK-312 part C, ADR-0272,
 * docs/API.md «Photo posts»): a drawing without a run, made and changed by
 * a key the phone chose, published by the API with its first photo. Others
 * read it as any drawing, with `source: "photos"` (api/drawings.ts).
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

/** What the phone sends of a post: every field every time. */
export type PhotoPostChoice = {
  title: string | null;
  description: string | null;
  visibility: PhotoPostVisibility;
  /** The public_id of the members tagged, in order. */
  tags: string[];
};

function postPath(key: string): string {
  return `/me/photo-posts/${encodeURIComponent(key)}`;
}

function isRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body);
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNothing(body: unknown): body is null {
  return body === null || body === undefined || body === "";
}

export function isPhotoPostVisibility(value: unknown): value is PhotoPostVisibility {
  return PHOTO_POST_VISIBILITIES.some((visibility) => visibility === value);
}

export function isMyPhotoPost(body: unknown): body is MyPhotoPost {
  return (
    isRecord(body) &&
    typeof body.key === "string" &&
    typeof body.id === "string" &&
    isStringOrNull(body.title) &&
    isStringOrNull(body.description) &&
    isPhotoPostVisibility(body.visibility) &&
    isStringOrNull(body.published_at) &&
    Array.isArray(body.tags) &&
    body.tags.every(isDrawingTag) &&
    Array.isArray(body.photos) &&
    body.photos.every(isDrawingPhoto) &&
    (body.order === null ||
      (Array.isArray(body.order) &&
        body.order.every((item) => typeof item === "string")))
  );
}

function isMyPhotoPosts(body: unknown): body is { photo_posts: MyPhotoPost[] } {
  return (
    isRecord(body) &&
    Array.isArray(body.photo_posts) &&
    body.photo_posts.every(isMyPhotoPost)
  );
}

/** PUT /me/photo-posts/{key}: the post as it should be now, made the first
 * time; sent again, it changes nothing. */
export function savePhotoPost(
  baseUrl: string,
  token: string,
  key: string,
  choice: PhotoPostChoice,
  options: Options = {},
): Promise<AccountOutcome<MyPhotoPost>> {
  const body: PhotoPostRequest = {
    title: choice.title,
    description: choice.description,
    visibility: choice.visibility,
    tags: choice.tags,
  };
  return ask(
    baseUrl,
    postPath(key),
    { method: "PUT", body, token },
    isMyPhotoPost,
    options,
  );
}

/** DELETE /me/photo-posts/{key}: gone with all it has, even when it was. */
export function removePhotoPost(
  baseUrl: string,
  token: string,
  key: string,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(baseUrl, postPath(key), { method: "DELETE", token }, isNothing, options);
}

/** PUT /me/photo-posts/{key}/photos/{n}: a JPEG in base64 into the place
 * `n` (1 to 10). The first one publishes the post. */
export function savePhotoPostPhoto(
  baseUrl: string,
  token: string,
  key: string,
  n: number,
  image: string,
  options: Options = {},
): Promise<AccountOutcome<MyPhotoPost>> {
  const body: DrawingPhotoRequest = { image };
  return ask(
    baseUrl,
    `${postPath(key)}/photos/${n}`,
    { method: "PUT", body, token },
    isMyPhotoPost,
    options,
  );
}

/** DELETE /me/photo-posts/{key}/photos/{n}: the place emptied, even when
 * it was. */
export function removePhotoPostPhoto(
  baseUrl: string,
  token: string,
  key: string,
  n: number,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(
    baseUrl,
    `${postPath(key)}/photos/${n}`,
    { method: "DELETE", token },
    isNothing,
    options,
  );
}

/** PUT /me/photo-posts/{key}/order: the photos by place, `photo:2`. */
export function savePhotoPostOrder(
  baseUrl: string,
  token: string,
  key: string,
  order: string[],
  options: Options = {},
): Promise<AccountOutcome<MyPhotoPost>> {
  return ask(
    baseUrl,
    `${postPath(key)}/order`,
    { method: "PUT", body: { order }, token },
    isMyPhotoPost,
    options,
  );
}

/** GET /me/photo-posts: the account's posts with their keys (part C1b):
 * the post opened by its id is found here to be changed or deleted. An API
 * before it says 404: none, there. */
export async function fetchMyPhotoPosts(
  baseUrl: string,
  token: string,
  options: Options = {},
): Promise<AccountOutcome<MyPhotoPost[]>> {
  const outcome = await ask(
    baseUrl,
    "/me/photo-posts",
    { method: "GET", token },
    isMyPhotoPosts,
    options,
  );
  if (outcome.kind === "ok") {
    return { kind: "ok", value: outcome.value.photo_posts };
  }
  return outcome.kind === "api_error" && outcome.code === "http_error"
    ? { kind: "ok", value: [] }
    : outcome;
}

/** Words for a call of a post that did not go; null when it did. */
export function photoPostProblem(outcome: AccountOutcome<unknown>): string | null {
  if (outcome.kind === "ok") {
    return null;
  }
  if (outcome.kind === "unreachable") {
    return t("No connection. Try again when you are online.");
  }
  if (outcome.kind === "api_error") {
    if (outcome.code === "session_expired" || outcome.code === "not_signed_in") {
      return t(SESSION_ENDED);
    }
    // The API's own words: a title too long, a member that is not one.
    if (outcome.code === "invalid_request") {
      return outcome.message;
    }
  }
  return accountProblem(outcome);
}
