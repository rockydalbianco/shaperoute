import {
  GYM_LEVEL_MEASURES,
  type GymLeaderboard,
  type GymLeaderboardRow,
} from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";

/**
 * The monthly leaderboard at the gym (TASK-385 F, ADR-0327, docs/API.md
 * «Gym»): an exercise of the catalog in a calendar month of Rome, the first
 * 50 and who asks. The body is packages/shared-types/fixtures/
 * gym-leaderboard.json.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

function isPerson(body: unknown): boolean {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { public_id, username } = body as Record<string, unknown>;
  return typeof public_id === "string" && typeof username === "string";
}

export function isGymLeaderboardRow(body: unknown): body is GymLeaderboardRow {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { rank, user, value, drawing_id } = body as Record<string, unknown>;
  return (
    typeof rank === "number" &&
    Number.isInteger(rank) &&
    rank >= 1 &&
    isPerson(user) &&
    typeof value === "number" &&
    Number.isFinite(value) &&
    typeof drawing_id === "string"
  );
}

export function isGymLeaderboard(body: unknown): body is GymLeaderboard {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { month, exercise, measure, people, rows, mine } = body as Record<
    string,
    unknown
  >;
  return (
    typeof month === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(month) &&
    typeof exercise === "string" &&
    (GYM_LEVEL_MEASURES as readonly unknown[]).includes(measure) &&
    typeof people === "number" &&
    Array.isArray(rows) &&
    rows.every(isGymLeaderboardRow) &&
    (mine === null || isGymLeaderboardRow(mine))
  );
}

/** GET /gym/leaderboard: `month` YYYY-MM, this one of Rome when null. */
export function fetchGymLeaderboard(
  baseUrl: string,
  token: string,
  exercise: string,
  month: string | null,
  options: Options = {},
): Promise<AccountOutcome<GymLeaderboard>> {
  const query = new URLSearchParams({ exercise });
  if (month !== null) {
    query.set("month", month);
  }
  return ask(
    baseUrl,
    `/gym/leaderboard?${query.toString()}`,
    { method: "GET", token },
    isGymLeaderboard,
    options,
  );
}

/** The month before or after `month` (YYYY-MM). */
export function shiftMonth(month: string, by: number): string {
  const [year, number] = month.split("-").map(Number);
  const index = year * 12 + (number - 1) + by;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}
