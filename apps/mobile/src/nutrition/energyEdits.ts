import type { BodyProfile } from "../body/bodyProfile";
import { restKcalPerMin } from "../body/energy";

/**
 * The energy the user corrects by hand (TASK-489, ADR-0397, the user's
 * request of 2026-11-23): what the body spends at rest in a day, and what
 * one activity took. A number written here takes the place of MuW's
 * estimate in the day's balance, and taking it away brings the estimate
 * back. Kept only on this phone; the calories of a post and the ones saved
 * to Apple Health are not touched.
 */
export type EnergyEdits = {
  /** Kilocalories a day at rest, as the user wrote them; null: the estimate. */
  restKcalPerDay: number | null;
  /** Kilocalories of an activity, by its key among the activities. */
  activities: { readonly [key: string]: number };
};

export const NO_EDITS: EnergyEdits = { restKcalPerDay: null, activities: {} };

/** The values the fields take: whole kilocalories. */
export const REST_KCAL_PER_DAY = { min: 1, max: 20000 } as const;
export const ACTIVITY_KCAL = { min: 0, max: 20000 } as const;

const MINUTES_A_DAY = 1440;

function whole(value: unknown, range: { min: number; max: number }): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const kcal = Math.round(value);
  return kcal >= range.min && kcal <= range.max ? kcal : null;
}

/** `edits` with the rest of a day written by the user; null, or a number
 * the field does not take, brings the estimate back. */
export function withRest(edits: EnergyEdits, kcalPerDay: number | null): EnergyEdits {
  return { ...edits, restKcalPerDay: whole(kcalPerDay, REST_KCAL_PER_DAY) };
}

/** `edits` with the kilocalories of the activity `key` written by the
 * user; null, or a number the field does not take, brings its estimate
 * back. */
export function withActivityKcal(
  edits: EnergyEdits,
  key: string,
  kcal: number | null,
): EnergyEdits {
  const kept = whole(kcal, ACTIVITY_KCAL);
  const activities: { [key: string]: number } = { ...edits.activities };
  if (kept === null) {
    delete activities[key];
  } else {
    activities[key] = kept;
  }
  return { ...edits, activities };
}

/** MuW's estimate of a day at rest for `body` in `year`, whole
 * kilocalories: body/energy.ts (Mifflin-St Jeor, or one standard MET with
 * a field missing) over the day's 1440 minutes. */
export function restEstimatePerDay(body: BodyProfile, year: number): number {
  return Math.round(restKcalPerMin(body, year) * MINUTES_A_DAY);
}

/** A number of the balance, and whether the user wrote it. */
export type Counted = { kcal: number; edited: boolean };

/** What a day at rest counts for: the user's number, else the estimate. */
export function restOf(edits: EnergyEdits, body: BodyProfile, year: number): Counted {
  return edits.restKcalPerDay === null
    ? { kcal: restEstimatePerDay(body, year), edited: false }
    : { kcal: edits.restKcalPerDay, edited: true };
}

/** What the activity `key` counts for: the user's number, else `estimate`. */
export function activityKcalOf(
  edits: EnergyEdits,
  key: string,
  estimate: number,
): Counted {
  const written = Object.prototype.hasOwnProperty.call(edits.activities, key)
    ? edits.activities[key]
    : undefined;
  return written === undefined
    ? { kcal: Math.max(0, Math.round(estimate)), edited: false }
    : { kcal: written, edited: true };
}

/** What of `data` are the user's corrections: a number that does not read
 * is left to the estimate. */
export function energyEditsFrom(data: unknown): EnergyEdits {
  if (typeof data !== "object" || data === null) {
    return NO_EDITS;
  }
  const raw = data as Record<string, unknown>;
  const activities: { [key: string]: number } = {};
  if (typeof raw.activities === "object" && raw.activities !== null) {
    for (const [key, value] of Object.entries(raw.activities)) {
      const kcal = whole(value, ACTIVITY_KCAL);
      if (key.length > 0 && kcal !== null) {
        activities[key] = kcal;
      }
    }
  }
  return {
    restKcalPerDay: whole(raw.restKcalPerDay, REST_KCAL_PER_DAY),
    activities,
  };
}
