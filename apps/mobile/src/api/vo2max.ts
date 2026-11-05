import {
  RUNNING_BEST_DISTANCES,
  type Vo2Max,
  type Vo2MaxSettings,
  type Vo2MaxSettingsRequest,
} from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";

/**
 * The VO₂ max of one's own profile (TASK-397, ADR-0332, docs/API.md,
 * «VO₂ max»): GET /me/vo2max says whether its owner said yes and what the
 * others would see; PUT /me/vo2max gives the yes, or takes it back. Both
 * with the session token. An API older than TASK-397 answers 404:
 * `http_error`. The value of Health (`/me/vo2max/reading`) is part C.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

const SOURCES: readonly string[] = ["apple_health", "health_connect", "estimate"];

/** GET /me/vo2max: the yes, and the VO₂ max shown with it (null: none). */
export function fetchVo2Max(
  baseUrl: string,
  token: string,
  options: Options = {},
): Promise<AccountOutcome<Vo2MaxSettings>> {
  return ask(
    baseUrl,
    "/me/vo2max",
    { method: "GET", token },
    isVo2MaxSettings,
    options,
  );
}

/** PUT /me/vo2max: `show` on or off; the answer is the yes as kept now. */
export function saveVo2MaxShow(
  baseUrl: string,
  token: string,
  show: boolean,
  options: Options = {},
): Promise<AccountOutcome<Vo2MaxSettings>> {
  const body: Vo2MaxSettingsRequest = { show };
  return ask(
    baseUrl,
    "/me/vo2max",
    { method: "PUT", body, token },
    isVo2MaxSettings,
    options,
  );
}

export function isVo2MaxSettings(body: unknown): body is Vo2MaxSettings {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const settings = body as Record<string, unknown>;
  return (
    typeof settings.show === "boolean" &&
    (settings.vo2max === null || isVo2Max(settings.vo2max))
  );
}

export function isVo2Max(body: unknown): body is Vo2Max {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const vo2max = body as Record<string, unknown>;
  const distances: readonly unknown[] = RUNNING_BEST_DISTANCES;
  return (
    typeof vo2max.value === "number" &&
    typeof vo2max.source === "string" &&
    SOURCES.includes(vo2max.source) &&
    typeof vo2max.measured_on === "string" &&
    (vo2max.from_distance === null || distances.includes(vo2max.from_distance))
  );
}
