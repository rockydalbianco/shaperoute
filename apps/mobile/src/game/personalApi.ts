import type { GamePersonal } from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "../api/accounts";

/**
 * The personal challenges and the streak on the API (TASK-423 part C,
 * ADR-0351; docs/API.md, «Shape game»): GET /game/personal, on the
 * phone's clock. An API before TASK-423 part C answers 404: no cards.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

const UNITS = new Set(["m", "count", "days", "pace_s"]);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNumbers(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((n) => typeof n === "number");
}

function isChallenge(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.unit === "string" &&
    UNITS.has(value.unit) &&
    isNumbers(value.tiers) &&
    value.tiers.length === 3
  );
}

function isStanding(value: unknown): boolean {
  return (
    isChallenge(value) &&
    (value.value === null || typeof value.value === "number") &&
    typeof value.tier === "number"
  );
}

function isPeriod(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.start === "string" &&
    DAY.test(value.start) &&
    typeof value.end === "string" &&
    DAY.test(value.end) &&
    Array.isArray(value.challenges) &&
    value.challenges.every(isStanding)
  );
}

function isStreak(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.runs === "number" &&
    typeof value.current === "number" &&
    typeof value.best === "number"
  );
}

function isFinished(value: unknown): boolean {
  return (
    isChallenge(value) &&
    (value.period === "week" || value.period === "month") &&
    typeof value.start === "string" &&
    DAY.test(value.start) &&
    typeof value.tier === "number" &&
    typeof value.done_at === "string"
  );
}

export function isGamePersonal(value: unknown): value is GamePersonal {
  return (
    isRecord(value) &&
    isPeriod(value.week) &&
    isPeriod(value.month) &&
    Array.isArray(value.streaks) &&
    value.streaks.every(isStreak) &&
    Array.isArray(value.finished) &&
    value.finished.every(isFinished)
  );
}

/** How far the phone's clock is from UTC now, in minutes: +60 in Rome in
 * winter. The API reads the week and the hours on it. */
export function offsetNow(nowMs: number = Date.now()): number {
  return -new Date(nowMs).getTimezoneOffset();
}

/** GET /game/personal?utc_offset_min=: the account's challenges of this
 * week and month, the streak and the medals of the last weeks. */
export function fetchGamePersonal(
  baseUrl: string,
  token: string,
  offsetMin: number,
  options: Options = {},
): Promise<AccountOutcome<GamePersonal>> {
  return ask(
    baseUrl,
    `/game/personal?utc_offset_min=${Math.round(offsetMin)}`,
    { method: "GET", token },
    isGamePersonal,
    options,
  );
}
