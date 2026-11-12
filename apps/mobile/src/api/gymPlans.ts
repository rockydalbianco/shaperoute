import {
  GYM_PLAN_MODES,
  GYM_RUN_KINDS,
  GYM_SET_KINDS,
  type GymPlan,
  type GymPlanItem,
  type GymPlanRequest,
  type GymPlanRun,
  type GymPlanRunner,
  type GymPlans,
  type GymPlanSession,
  type GymProgram,
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

function isDay(day: unknown): boolean {
  return Number.isInteger(day) && (day as number) >= 1 && (day as number) <= 7;
}

const RUN_VALUES = ["distance_m", "duration_s", "reps", "rep_m", "rep_s"] as const;

/** The run of a run day (TASK-433 C). */
export function isGymPlanRun(body: unknown): body is GymPlanRun {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const run = body as Record<string, unknown>;
  return (
    (GYM_RUN_KINDS as readonly unknown[]).includes(run.kind) &&
    RUN_VALUES.every(
      (field) =>
        run[field] === undefined ||
        (typeof run[field] === "number" && Number.isFinite(run[field])),
    )
  );
}

function isSessions(body: unknown): body is GymPlanSession[] {
  return (
    Array.isArray(body) &&
    body.every((one) => {
      if (typeof one !== "object" || one === null) {
        return false;
      }
      const { day, name, items, run } = one as Record<string, unknown>;
      return (
        isDay(day) &&
        typeof name === "string" &&
        Array.isArray(items) &&
        items.every(isGymPlanItem) &&
        (run === undefined || isGymPlanRun(run))
      );
    })
  );
}

/** How the owner of a plan with run days runs. */
export function isGymPlanRunner(body: unknown): body is GymPlanRunner {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { pace_10k_s, long_m, long_s } = body as Record<string, unknown>;
  const number = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value);
  return (
    number(pace_10k_s) &&
    (long_m === undefined || number(long_m)) &&
    (long_s === undefined || number(long_s))
  );
}

/** The weeks of a plan made with the guide (migration 0066). */
export function isGymProgram(body: unknown): body is GymProgram {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { starts_on, weeks, mode, step_kg, sessions, custom, runner } = body as Record<
    string,
    unknown
  >;
  return (
    typeof starts_on === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(starts_on) &&
    Number.isInteger(weeks) &&
    (weeks as number) >= 1 &&
    (GYM_PLAN_MODES as readonly unknown[]).includes(mode) &&
    typeof step_kg === "number" &&
    Number.isFinite(step_kg) &&
    isSessions(sessions) &&
    (runner === undefined || isGymPlanRunner(runner)) &&
    Array.isArray(custom) &&
    custom.every(
      (week) =>
        typeof week === "object" &&
        week !== null &&
        Number.isInteger((week as Record<string, unknown>).week) &&
        isSessions((week as Record<string, unknown>).sessions),
    )
  );
}

export function isGymPlan(body: unknown): body is GymPlan {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { key, name, days, items, position, updated_at, program } = body as Record<
    string,
    unknown
  >;
  return (
    typeof key === "string" &&
    typeof name === "string" &&
    Array.isArray(days) &&
    days.every(isDay) &&
    (program === undefined || program === null || isGymProgram(program)) &&
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
