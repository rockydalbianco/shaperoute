import { type EnergyEdits } from "./energyEdits";
import { type LocalDay, localDayOf } from "./localDay";

/**
 * The balance of a day (TASK-489, ADR-0397): eaten − (rest + activity),
 * in whole kilocalories. Every number is an estimate.
 *
 * - Rest: what the body spends in a day doing nothing (energyEdits.ts: the
 *   user's own number, else body/energy.ts).
 * - Activity: when the day has the active energy of Apple Health, that
 *   alone, and MuW's activities are not added on top of it: Health has
 *   counted them already. Otherwise the activities of the day, each once.
 * - No activity twice: a workout read from Health that MuW itself wrote
 *   is the activity MuW already has; one from another app that overlaps an
 *   activity for more than half of the shorter of the two is the same
 *   outing recorded twice.
 * - A number the user corrected by hand (energyEdits.ts) takes the place
 *   of the estimate. On a day counted from Health's active energy, where
 *   one activity cannot be taken out of the total, a corrected activity
 *   moves the day by the difference from what it counted for before.
 */

/** An activity as the balance sees it. */
export type DayActivity = {
  /** Its key among the activities (MuW's) or Health's own id of the workout. */
  key: string;
  /** Recorded or imported in MuW, or read from Apple Health / Health Connect. */
  source: "muw" | "health";
  /** A workout of Health that MuW wrote there; always false for MuW's own. */
  writtenByMuw: boolean;
  startMs: number;
  endMs: number;
  /** Its active energy: MuW's estimate, or what the other app saved. */
  kcal: number;
};

function sameOuting(a: DayActivity, b: DayActivity): boolean {
  const shorter = Math.min(a.endMs - a.startMs, b.endMs - b.startMs);
  if (!(shorter > 0)) {
    return false;
  }
  const shared = Math.min(a.endMs, b.endMs) - Math.max(a.startMs, b.startMs);
  return shared > shorter / 2;
}

/**
 * `activities` with each outing once: all of MuW's, then the workouts of
 * Health that are none of them and not one another, the earliest first.
 */
export function countedActivities(activities: readonly DayActivity[]): DayActivity[] {
  const counted = activities.filter((activity) => activity.source === "muw");
  const others = activities
    .filter((activity) => activity.source === "health" && !activity.writtenByMuw)
    .sort(
      (a, b) => a.startMs - b.startMs || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
    );
  for (const other of others) {
    if (!counted.some((kept) => sameOuting(kept, other))) {
      counted.push(other);
    }
  }
  return counted;
}

/** The activities that started on `day`, by the phone's calendar: an
 * outing across midnight belongs to the day it began. */
export function activitiesOn(
  activities: readonly DayActivity[],
  day: LocalDay,
): DayActivity[] {
  return activities.filter(
    (activity) => localDayOf(new Date(activity.startMs)) === day,
  );
}

export type Used = {
  rest: number;
  active: number;
  /** rest + active. */
  used: number;
  /** The activity is the active energy of Apple Health, not a sum. */
  fromHealth: boolean;
};

export type UsedInput = {
  /** What a whole day at rest counts for (energyEdits.ts, `restOf`). */
  restKcalPerDay: number;
  /** How much of the day has gone by, 0 to 1: 1 for a day that is over
   * (localDay.ts, `dayFraction`). */
  fraction?: number;
  /** The activities of the day, MuW's and Health's together. */
  activities: readonly DayActivity[];
  /** The active energy of the day in Apple Health; null when Health has
   * none or MuW may not read it. */
  healthActiveKcal: number | null;
  edits: EnergyEdits;
};

function edited(edits: EnergyEdits, key: string): number | null {
  return Object.prototype.hasOwnProperty.call(edits.activities, key)
    ? edits.activities[key]
    : null;
}

/** What the body used in the day. */
export function usedKcal(input: UsedInput): Used {
  const fraction = Math.min(1, Math.max(0, input.fraction ?? 1));
  const rest = Math.round(Math.max(0, input.restKcalPerDay) * fraction);
  const counted = countedActivities(input.activities);
  let active: number;
  if (input.healthActiveKcal !== null) {
    active = Math.max(0, input.healthActiveKcal);
    for (const activity of counted) {
      const written = edited(input.edits, activity.key);
      if (written !== null) {
        active += written - Math.max(0, activity.kcal);
      }
    }
  } else {
    active = counted.reduce(
      (sum, activity) =>
        sum + (edited(input.edits, activity.key) ?? Math.max(0, activity.kcal)),
      0,
    );
  }
  const whole = Math.max(0, Math.round(active));
  return {
    rest,
    active: whole,
    used: rest + whole,
    fromHealth: input.healthActiveKcal !== null,
  };
}

/** More eaten than used, less, or the same to the kilocalorie. Words, not
 * a judgement: neither is good or bad here. */
export type BalanceKind = "surplus" | "deficit" | "even";

export type Balance = Used & {
  eaten: number;
  /** eaten − used: above zero a surplus, below it a deficit. */
  balance: number;
  kind: BalanceKind;
};

/** The balance of a day; null for a day with nothing written in the
 * diary, which stays empty instead of showing a deficit of a whole day. */
export function dayBalance(eatenKcal: number | null, used: Used): Balance | null {
  if (eatenKcal === null) {
    return null;
  }
  const eaten = Math.max(0, Math.round(eatenKcal));
  const balance = eaten - used.used;
  return {
    ...used,
    eaten,
    balance,
    kind: balance > 0 ? "surplus" : balance < 0 ? "deficit" : "even",
  };
}
