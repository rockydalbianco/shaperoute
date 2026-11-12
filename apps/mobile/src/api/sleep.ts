import {
  type ActivitySleep,
  type ActivitySleepRequest,
  SLEEP_NIGHT_MAX_MIN,
  SLEEP_SCORE_MAX,
  type SleepShownRequest,
  type SleepStages,
  type SleepSummary,
} from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";

/**
 * The night of sleep in the post of an activity, on the API (TASK-467
 * parts B1 and B2, ADR-0380, docs/API.md «Sleep»): the summary the phone
 * worked out, kept with the activity and shown in its post while `shown`
 * is on. The bodies are packages/shared-types/fixtures/sleep-*.json.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

function isMinutes(value: unknown, least = 0): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= least &&
    value <= SLEEP_NIGHT_MAX_MIN
  );
}

function isStages(value: unknown): value is SleepStages {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { rem_min, light_min, deep_min } = value as Record<string, unknown>;
  return isMinutes(rem_min) && isMinutes(light_min) && isMinutes(deep_min);
}

/** A night as others read it, in the limits of the contract; `stages` may
 * be left out. */
export function isSleepSummary(body: unknown): body is SleepSummary {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { night, score, asleep_min, awake_min, stages } = body as Record<
    string,
    unknown
  >;
  return (
    typeof night === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(night) &&
    typeof score === "number" &&
    Number.isInteger(score) &&
    score >= 0 &&
    score <= SLEEP_SCORE_MAX &&
    isMinutes(asleep_min, 1) &&
    isMinutes(awake_min) &&
    (stages === undefined || isStages(stages))
  );
}

/** The night a post carries (`sleep` of a drawing in a list, part B1b), or
 * null: without one, or when it is not a night the app can show. */
export function sleepSummaryOf(value: unknown): SleepSummary | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  // An API that says an untold `stages` with a null: the same as left out.
  const { stages, ...rest } = value as Record<string, unknown>;
  const night = stages === null || stages === undefined ? rest : { ...rest, stages };
  return isSleepSummary(night) ? night : null;
}

export function isActivitySleep(body: unknown): body is ActivitySleep {
  return (
    isSleepSummary(body) &&
    typeof (body as unknown as Record<string, unknown>).shown === "boolean"
  );
}

function isEmpty(body: unknown, status: number): body is null {
  return status === 204 && body === null;
}

function pathOf(key: string): string {
  return `/me/activities/${encodeURIComponent(key)}/sleep`;
}

/** PUT /me/activities/{key}/sleep: the night before the activity, kept
 * with these figures and given to it. 404 without the activity, 422 when
 * it is not the night before it. */
export function saveActivitySleep(
  baseUrl: string,
  token: string,
  key: string,
  request: ActivitySleepRequest,
  options: Options = {},
): Promise<AccountOutcome<ActivitySleep>> {
  return ask(
    baseUrl,
    pathOf(key),
    { method: "PUT", body: request, token },
    isActivitySleep,
    options,
  );
}

/** PATCH /me/activities/{key}/sleep: «Sleep last night» on or off, without
 * the figures. 404 for an activity without a night. */
export function showActivitySleep(
  baseUrl: string,
  token: string,
  key: string,
  shown: boolean,
  options: Options = {},
): Promise<AccountOutcome<ActivitySleep>> {
  const body: SleepShownRequest = { shown };
  return ask(
    baseUrl,
    pathOf(key),
    { method: "PATCH", body, token },
    isActivitySleep,
    options,
  );
}

/** GET /me/activities/{key}/sleep: the night of one's own activity, with
 * its switch; 404 without one. */
export function fetchActivitySleep(
  baseUrl: string,
  token: string,
  key: string,
  options: Options = {},
): Promise<AccountOutcome<ActivitySleep>> {
  return ask(baseUrl, pathOf(key), { method: "GET", token }, isActivitySleep, options);
}

/** DELETE /me/activities/{key}/sleep: the activity without a night; 204
 * the second time too. */
export function removeActivitySleep(
  baseUrl: string,
  token: string,
  key: string,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(baseUrl, pathOf(key), { method: "DELETE", token }, isEmpty, options);
}

/** GET /drawings/{id}/sleep: the night in a post, for whoever sees it
 * while it is shown; 404 otherwise. The lists of posts carry it already
 * (`sleep`): this is for a post read from elsewhere. */
export function fetchDrawingSleep(
  baseUrl: string,
  token: string,
  drawingId: string,
  options: Options = {},
): Promise<AccountOutcome<SleepSummary>> {
  return ask(
    baseUrl,
    `/drawings/${encodeURIComponent(drawingId)}/sleep`,
    { method: "GET", token },
    isSleepSummary,
    options,
  );
}
