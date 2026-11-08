import {
  GYM_SET_KINDS,
  type GymPlan,
  type GymPlanItem,
  type GymPlanRequest,
  type GymPlans,
} from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";

/**
 * The plans of the gym (TASK-411 C, ADR-0341 point 3, docs/API.md «Gym»):
 * one's own, kept with the key the phone chose. The bodies are
 * packages/shared-types/fixtures/gym-plans.json. An API older than part C
 * answers 404: the plans stay on the phone and go up later.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

const VALUES = [
  "reps",
  "load_kg",
  "duration_s",
  "distance_m",
  "speed_kmh",
  "incline_pct",
  "level",
  "floors",
] as const;

export function isGymPlanItem(body: unknown): body is GymPlanItem {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const item = body as Record<string, unknown>;
  return (
    (typeof item.exercise === "string") !== (typeof item.name === "string") &&
    (GYM_SET_KINDS as readonly unknown[]).includes(item.kind) &&
    typeof item.sets === "number" &&
    Number.isInteger(item.sets) &&
    item.sets >= 1 &&
    VALUES.every(
      (field) =>
        item[field] === undefined ||
        (typeof item[field] === "number" && Number.isFinite(item[field])),
    )
  );
}

export function isGymPlan(body: unknown): body is GymPlan {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { key, name, days, items, position, updated_at } = body as Record<
    string,
    unknown
  >;
  return (
    typeof key === "string" &&
    typeof name === "string" &&
    Array.isArray(days) &&
    days.every((day) => Number.isInteger(day) && day >= 1 && day <= 7) &&
    Array.isArray(items) &&
    items.every(isGymPlanItem) &&
    typeof position === "number" &&
    typeof updated_at === "string" &&
    !Number.isNaN(new Date(updated_at).getTime())
  );
}

export function isGymPlans(body: unknown): body is GymPlans {
  return (
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as Record<string, unknown>).plans) &&
    ((body as Record<string, unknown>).plans as unknown[]).every(isGymPlan)
  );
}

/** GET /me/gym-plans. */
export function fetchGymPlans(
  baseUrl: string,
  token: string,
  options: Options = {},
): Promise<AccountOutcome<GymPlans>> {
  return ask(baseUrl, "/me/gym-plans", { method: "GET", token }, isGymPlans, options);
}

/** PUT /me/gym-plans/{key}: the plan as kept, which an older change does
 * not replace. */
export function saveGymPlan(
  baseUrl: string,
  token: string,
  key: string,
  plan: GymPlanRequest,
  options: Options = {},
): Promise<AccountOutcome<GymPlan>> {
  return ask(
    baseUrl,
    `/me/gym-plans/${encodeURIComponent(key)}`,
    { method: "PUT", token, body: plan },
    isGymPlan,
    options,
  );
}

/** DELETE /me/gym-plans/{key}: 204, also for one that is not there. */
export function dropGymPlan(
  baseUrl: string,
  token: string,
  key: string,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(
    baseUrl,
    `/me/gym-plans/${encodeURIComponent(key)}`,
    { method: "DELETE", token },
    (body: unknown, status: number): body is null => status === 204 && body === null,
    options,
  );
}
