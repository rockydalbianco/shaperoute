import type {
  OutfitShop,
  OutfitTagRequest,
  OutfitTags,
  OutfitTagsRequest,
} from "@shaperoute/shared-types";

import { isOutfitTag } from "../social/outfit/outfitTags";
import { type AccountOutcome, ask } from "./accounts";

/**
 * The items a member tags on the photos of its posts (TASK-394, ADR-0333;
 * docs/API.md, «Outfit tags»): the whole list of a photo, its owner's; a
 * dot opened, and «Shop», by whoever sees the photo.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

function isOutfitTags(body: unknown): body is OutfitTags {
  return (
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as { tags?: unknown }).tags) &&
    (body as { tags: unknown[] }).tags.every(isOutfitTag)
  );
}

function isOutfitShop(body: unknown): body is OutfitShop {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const url = (body as { url?: unknown }).url;
  return url === null || typeof url === "string";
}

function isNothing(body: unknown, status: number): body is null {
  return status === 204 && body === null;
}

/**
 * PUT /me/activities/{key}/drawing/photos/{n}/tags: every item of the photo
 * `n`, in order; the answer is the list as kept, with the ids of the new ones.
 */
export function saveOutfitTags(
  baseUrl: string,
  token: string,
  key: string,
  n: number,
  tags: readonly OutfitTagRequest[],
  options: Options = {},
): Promise<AccountOutcome<OutfitTags>> {
  const body: OutfitTagsRequest = { tags: [...tags] };
  return ask(
    baseUrl,
    `/me/activities/${encodeURIComponent(key)}/drawing/photos/${n}/tags`,
    { method: "PUT", body, token },
    isOutfitTags,
    options,
  );
}

/** One more opening of an item for the day. Nothing goes wrong for the
 * user when it is not counted. */
export async function countOutfitOpen(
  baseUrl: string,
  token: string,
  id: string,
  options: Options = {},
): Promise<void> {
  await ask(
    baseUrl,
    `/outfit-tags/${encodeURIComponent(id)}/open`,
    { method: "POST", token },
    isNothing,
    options,
  );
}

/**
 * «Shop»: one more for the day, and the shop's page, checked again by the
 * API. Null when there is none to open: no link, a link MuW cannot open any
 * more, or no answer; only an https page is opened.
 */
export async function fetchOutfitShop(
  baseUrl: string,
  token: string,
  id: string,
  options: Options = {},
): Promise<AccountOutcome<string | null>> {
  const outcome = await ask(
    baseUrl,
    `/outfit-tags/${encodeURIComponent(id)}/shop`,
    { method: "POST", token },
    isOutfitShop,
    options,
  );
  if (outcome.kind !== "ok") {
    return outcome;
  }
  const url = outcome.value.url;
  return {
    kind: "ok",
    value: typeof url === "string" && url.startsWith("https://") ? url : null,
  };
}
