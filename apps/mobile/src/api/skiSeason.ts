import type { SkiDay, SkiDayPart, SkiSeason } from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";

/**
 * A skier's season and the parts of a saved day (TASK-429 part C, ADR-0357,
 * docs/API.md «I tratti della giornata e la stagione»): the bodies are
 * packages/shared-types/fixtures/ski-season.json and ski-day-parts.json.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const isNumberOrNull = (value: unknown) => value === null || isNumber(value);

export function isSkiSeason(body: unknown): body is SkiSeason {
  return (
    isObject(body) &&
    typeof body.from === "string" &&
    typeof body.to === "string" &&
    isNumber(body.days) &&
    isNumber(body.days_with_parts) &&
    isNumber(body.skied_m) &&
    isNumber(body.vertical_m) &&
    isNumber(body.descents) &&
    isNumber(body.lifts) &&
    isNumberOrNull(body.top_mps) &&
    isNumber(body.moving_s)
  );
}

export function isSkiDayPart(value: unknown): value is SkiDayPart {
  return (
    isObject(value) &&
    (value.kind === "lift" || value.kind === "descent") &&
    isNumber(value.n) &&
    isNumberOrNull(value.start_s) &&
    isNumberOrNull(value.end_s) &&
    isNumber(value.moving_s) &&
    isNumber(value.metres) &&
    isNumber(value.height_m) &&
    isNumberOrNull(value.top_mps) &&
    isNumberOrNull(value.from_fix) &&
    isNumberOrNull(value.to_fix) &&
    (value.name === null || typeof value.name === "string")
  );
}

/** The parts of a day as GET /drawings/{id}/ski-day gave them, the ones
 * that are parts; none for a day without them, or an API before them. */
export function partsOf(day: SkiDay | null): SkiDayPart[] {
  const parts: unknown = day === null ? undefined : (day as { parts?: unknown }).parts;
  return Array.isArray(parts) ? parts.filter(isSkiDayPart) : [];
}

/** The days of the season of `today`: from the first of July to the end of
 * June, as the winters of the north go. */
export function seasonOf(today: Date): { from: string; to: string; years: string } {
  const first = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
  return {
    from: `${first}-07-01`,
    to: `${first + 1}-06-30`,
    years: `${first}/${String(first + 1).slice(-2)}`,
  };
}

/** GET /me/ski-season: the sums of the account's days between two days. */
export function fetchSkiSeason(
  baseUrl: string,
  token: string,
  from: string,
  to: string,
  options: Options = {},
): Promise<AccountOutcome<SkiSeason>> {
  return ask(
    baseUrl,
    `/me/ski-season?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { method: "GET", token },
    isSkiSeason,
    options,
  );
}
