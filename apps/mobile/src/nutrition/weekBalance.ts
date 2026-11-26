import { balanceOf, type DayEnergy } from "./activityEnergy";
import type { BalanceKind } from "./dayBalance";
import type { LocalDay } from "./localDay";

/**
 * A week of the day's balance (TASK-489 part D, ADR-0397): a row for each
 * day, Monday to Sunday, and what the week adds up to.
 *
 * - A day with nothing written in the diary is empty, all of it: it is not
 *   a day of zero calories, and it does not count in the total.
 * - The day still running shows what it has so far, and counts in the total
 *   only once it is over (the user's choice, 2026-11-23): half a day of
 *   rest against half a day of meals would lean the week one way.
 * - A day that has not come is empty.
 */

export type WeekRow = {
  day: LocalDay;
  /** Whole kilocalories; null for an empty day. */
  eaten: number | null;
  used: number | null;
  /** eaten − used. */
  balance: number | null;
  kind: BalanceKind | null;
  /** The day still running: its numbers are the ones so far. */
  soFar: boolean;
};

/**
 * The rows of a week: `energies` are its days in order (activityEnergy.ts)
 * and `eatenOn` says what the diary has for a day, null with nothing
 * written.
 */
export function weekRows(
  energies: readonly DayEnergy[],
  eatenOn: (day: LocalDay) => number | null,
): WeekRow[] {
  return energies.map((energy) => {
    const balance = balanceOf(eatenOn(energy.day), energy);
    return balance === null
      ? {
          day: energy.day,
          eaten: null,
          used: null,
          balance: null,
          kind: null,
          soFar: energy.soFar,
        }
      : {
          day: energy.day,
          eaten: balance.eaten,
          used: balance.used,
          balance: balance.balance,
          kind: balance.kind,
          soFar: energy.soFar,
        };
  });
}

export type WeekTotal = {
  eaten: number;
  used: number;
  balance: number;
  kind: BalanceKind;
  /** How many days it adds up. */
  days: number;
};

/** What the days of the week that are over and written add up to; null
 * when there is none. */
export function weekTotal(rows: readonly WeekRow[]): WeekTotal | null {
  let eaten = 0;
  let used = 0;
  let days = 0;
  for (const row of rows) {
    if (row.eaten !== null && row.used !== null && !row.soFar) {
      eaten += row.eaten;
      used += row.used;
      days += 1;
    }
  }
  if (days === 0) {
    return null;
  }
  const balance = eaten - used;
  return {
    eaten,
    used,
    balance,
    kind: balance > 0 ? "surplus" : balance < 0 ? "deficit" : "even",
    days,
  };
}

/** Whether the week leaves today out of its total: today has numbers. */
export function todayLeftOut(rows: readonly WeekRow[]): boolean {
  return rows.some((row) => row.soFar && row.balance !== null);
}
