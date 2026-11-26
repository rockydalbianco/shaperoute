import {
  type ActivityGearRequest,
  type Gear,
  type GearList,
  type GearRequest,
} from "@shaperoute/shared-types";

import { type AccountOutcome, ask, authHeaders } from "./accounts";
import { apiKey, keyHeaders } from "./apiUrl";

/**
 * A member's gear (TASK-486, ADR-0393, docs/API.md, «Gear»): the list, an
 * item whole, its photo, all with the session token. The bodies are
 * packages/shared-types/fixtures/gear*.json.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

function gearPath(id: string): string {
  return `/me/gear/${encodeURIComponent(id)}`;
}

/**
 * GET /me/gear: every item, in use first. An API without gear answers 404:
 * null then, and the app shows no «Gear».
 */
export function fetchMyGear(
  baseUrl: string,
  token: string,
  options: Options = {},
): Promise<AccountOutcome<Gear[] | null>> {
  return ask(baseUrl, "/me/gear", { method: "GET", token }, isGearList, options).then(
    (outcome) =>
      outcome.kind === "ok"
        ? { kind: "ok", value: outcome.value.gear }
        : outcome.kind === "api_error" && outcome.code === "http_error"
          ? { kind: "ok", value: null }
          : outcome,
  );
}

/** POST /me/gear: a new item, as the API kept it. */
export function addGear(
  baseUrl: string,
  token: string,
  request: GearRequest,
  options: Options = {},
): Promise<AccountOutcome<Gear>> {
  return ask(
    baseUrl,
    "/me/gear",
    { method: "POST", body: request, token },
    isGear,
    options,
  );
}

/** PUT /me/gear/{id}: the whole item, changed. */
export function saveGear(
  baseUrl: string,
  token: string,
  id: string,
  request: GearRequest,
  options: Options = {},
): Promise<AccountOutcome<Gear>> {
  return ask(
    baseUrl,
    gearPath(id),
    { method: "PUT", body: request, token },
    isGear,
    options,
  );
}

/** DELETE /me/gear/{id}: gone, with its photo and its activities' links. */
export function deleteGear(
  baseUrl: string,
  token: string,
  id: string,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(baseUrl, gearPath(id), { method: "DELETE", token }, isEmpty, options);
}

/** PUT /me/gear/{id}/photo: the photo as base64; the item comes back. */
export function saveGearPhoto(
  baseUrl: string,
  token: string,
  id: string,
  base64: string,
  options: Options = {},
): Promise<AccountOutcome<Gear>> {
  return ask(
    baseUrl,
    `${gearPath(id)}/photo`,
    { method: "PUT", body: { image: base64 }, token },
    isGear,
    options,
  );
}

/** DELETE /me/gear/{id}/photo: gone, or never there. */
export function removeGearPhoto(
  baseUrl: string,
  token: string,
  id: string,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(
    baseUrl,
    `${gearPath(id)}/photo`,
    { method: "DELETE", token },
    isEmpty,
    options,
  );
}

function activityGearPath(key: string): string {
  return `/me/activities/${encodeURIComponent(key)}/gear`;
}

/** GET /me/activities/{key}/gear: the items on an activity (TASK-486 part
 * C), retired ones too. 404: the API has no such activity, or no gear. */
export function fetchActivityGear(
  baseUrl: string,
  token: string,
  key: string,
  options: Options = {},
): Promise<AccountOutcome<Gear[]>> {
  return ask(
    baseUrl,
    activityGearPath(key),
    { method: "GET", token },
    isGearList,
    options,
  ).then((outcome) =>
    outcome.kind === "ok" ? { kind: "ok", value: outcome.value.gear } : outcome,
  );
}

/** PUT /me/activities/{key}/gear: the whole list of the activity, up to
 * `GEAR_MAX_ON_ACTIVITY`; the items as the API keeps them come back. */
export function saveActivityGear(
  baseUrl: string,
  token: string,
  key: string,
  request: ActivityGearRequest,
  options: Options = {},
): Promise<AccountOutcome<Gear[]>> {
  return ask(
    baseUrl,
    activityGearPath(key),
    { method: "PUT", body: request, token },
    isGearList,
    options,
  ).then((outcome) =>
    outcome.kind === "ok" ? { kind: "ok", value: outcome.value.gear } : outcome,
  );
}

/** What an `Image` shows of an item's photo: its address on the API, read
 * with the token and the key, as a drawing's photo (TASK-330). */
export function gearPhotoSource(
  baseUrl: string,
  token: string,
  photoUrl: string,
  key: string | null = apiKey(),
): { uri: string; headers: Record<string, string> } {
  return {
    uri: `${baseUrl}${photoUrl}`,
    headers: { ...keyHeaders(key), ...authHeaders(token) },
  };
}

function isEmpty(body: unknown, status: number): body is null {
  return status === 204 && body === null;
}

export function isGear(body: unknown): body is Gear {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const item = body as Record<string, unknown>;
  const totals = item.totals as Record<string, unknown> | undefined;
  return (
    typeof item.id === "string" &&
    typeof item.brand === "string" &&
    typeof item.retired === "boolean" &&
    // A kind of a newer API is kept: the app shows it as «Other».
    typeof item.kind === "string" &&
    typeof totals === "object" &&
    totals !== null &&
    typeof totals.distance_m === "number" &&
    typeof totals.duration_s === "number" &&
    typeof totals.activities === "number"
  );
}

export function isGearList(body: unknown): body is GearList {
  return (
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as { gear?: unknown }).gear) &&
    (body as { gear: unknown[] }).gear.every(isGear)
  );
}
