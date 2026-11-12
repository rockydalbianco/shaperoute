import type {
  SleepNight,
  SleepNightRequest,
  SleepSummary,
} from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";
import { isSleepSummary } from "./sleep";

/**
 * The night of sleep a person shares on the profile, on the API (TASK-467
 * parts B1 and B3, ADR-0380, docs/API.md «Sleep»): the summary the phone
 * worked out, kept only once its owner taps «Share», and read by whoever
 * can open the profile. The bodies are
 * packages/shared-types/fixtures/sleep-night*.json and sleep-summary.json.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

/** A night as its owner reads it: the summary and whether the profile
 * shows it. */
export function isSleepNight(body: unknown): body is SleepNight {
  return (
    isSleepSummary(body) &&
    typeof (body as unknown as Record<string, unknown>).shared === "boolean"
  );
}

function isEmpty(body: unknown, status: number): body is null {
  return status === 204 && body === null;
}

/** PUT /me/sleep/{night} with `shared` on: the night on the profile, with
 * these figures. Only what the card shows goes: the score, the minutes
 * and the stages, and the day in the path. */
export function shareSleepNight(
  baseUrl: string,
  token: string,
  night: SleepSummary,
  options: Options = {},
): Promise<AccountOutcome<SleepNight>> {
  const body: SleepNightRequest = {
    score: night.score,
    asleep_min: night.asleep_min,
    awake_min: night.awake_min,
    ...(night.stages === undefined ? {} : { stages: night.stages }),
    shared: true,
  };
  return ask(
    baseUrl,
    `/me/sleep/${encodeURIComponent(night.night)}`,
    { method: "PUT", body, token },
    isSleepNight,
    options,
  );
}

/** DELETE /me/sleep/shared: no night of the account is on its profile any
 * more; 204 the second time too. A night no post carries is then off the
 * server. */
export function stopSharingSleep(
  baseUrl: string,
  token: string,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(
    baseUrl,
    "/me/sleep/shared",
    { method: "DELETE", token },
    isEmpty,
    options,
  );
}

/** GET /users/{id}/sleep: the latest night the profile shares, for whoever
 * can open it, its owner too; 404 without one, and for a profile that
 * cannot be opened, all alike. */
export function fetchProfileSleep(
  baseUrl: string,
  token: string,
  publicId: string,
  options: Options = {},
): Promise<AccountOutcome<SleepSummary>> {
  return ask(
    baseUrl,
    `/users/${encodeURIComponent(publicId)}/sleep`,
    { method: "GET", token },
    isSleepSummary,
    options,
  );
}
