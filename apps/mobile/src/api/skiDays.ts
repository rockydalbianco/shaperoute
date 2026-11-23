import type { ResortSnow, SkiDay, SkiDayRequest } from "@shaperoute/shared-types";
import { SNOW_TYPES } from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";

/**
 * A day of skiing's resort, gear and snow (TASK-406 part D, ADR-0338,
 * docs/API.md «La giornata di sci: stazione, modello e neve»): written by the
 * skier after the day is saved, shown on the post to whoever sees it. The
 * bodies are packages/shared-types/fixtures/ski-day-request.json,
 * ski-day.json and resort-snow.json.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isSnow = (value: unknown) =>
  typeof value === "string" && (SNOW_TYPES as readonly string[]).includes(value);

export function isSkiDay(body: unknown): body is SkiDay {
  if (!isObject(body)) {
    return false;
  }
  const { resort, gear, snow } = body;
  return (
    (resort === null ||
      (isObject(resort) &&
        typeof resort.id === "string" &&
        typeof resort.name === "string")) &&
    (gear === null || typeof gear === "string") &&
    (snow === null || isSnow(snow))
  );
}

export function isResortSnow(body: unknown): body is ResortSnow {
  return (
    isObject(body) &&
    typeof body.resort_id === "string" &&
    typeof body.since === "string" &&
    Array.isArray(body.snow) &&
    body.snow.every(
      (count) =>
        isObject(count) &&
        isSnow(count.snow) &&
        typeof count.days === "number" &&
        Number.isInteger(count.days) &&
        count.days >= 1,
    )
  );
}

/** The API's 404 for a day it does not have (activities.py,
 * UNKNOWN_ACTIVITY): a day still on its way, unlike the 422s. */
export const UNKNOWN_DAY = "No activity with this key.";

/** What the outbox does with the answer: gone, again later, or never. */
export type SkiDaySent = "sent" | "later" | "refused";

export function sentOf(outcome: AccountOutcome<SkiDay>): SkiDaySent {
  if (outcome.kind === "ok") {
    return "sent";
  }
  // Without a connection, a server that fails, a session to sign in again,
  // a day not there yet: later. A day that is not skiing, or a resort gone:
  // never.
  if (
    outcome.kind === "api_error" &&
    (outcome.code === "invalid_request" ||
      (outcome.code === "http_error" && outcome.message !== UNKNOWN_DAY))
  ) {
    return "refused";
  }
  return "later";
}

/** PUT /me/activities/{key}/ski: written whole, the last one wins. 404 for a
 * day the API does not have yet, 422 for a day that is not skiing. */
export function keepSkiDay(
  baseUrl: string,
  token: string,
  key: string,
  request: SkiDayRequest,
  options: Options = {},
): Promise<AccountOutcome<SkiDay>> {
  return ask(
    baseUrl,
    `/me/activities/${encodeURIComponent(key)}/ski`,
    { method: "PUT", body: request, token },
    isSkiDay,
    options,
  );
}

/** GET /drawings/{id}/ski-day: all null for a day without them. */
export function fetchSkiDay(
  baseUrl: string,
  token: string,
  drawingId: string,
  options: Options = {},
): Promise<AccountOutcome<SkiDay>> {
  return ask(
    baseUrl,
    `/drawings/${encodeURIComponent(drawingId)}/ski-day`,
    { method: "GET", token },
    isSkiDay,
    options,
  );
}

/** GET /ski-resorts/{id}/snow: the members' snow of the last 24 hours, for
 * the resort's page (part D3). */
export function fetchResortSnow(
  baseUrl: string,
  token: string,
  resortId: string,
  options: Options = {},
): Promise<AccountOutcome<ResortSnow>> {
  return ask(
    baseUrl,
    `/ski-resorts/${encodeURIComponent(resortId)}/snow`,
    { method: "GET", token },
    isResortSnow,
    options,
  );
}
