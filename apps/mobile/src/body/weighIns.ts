import { onOwnerChange, ownedFile } from "../account/currentOwner";
import { addDays, isLocalDay, type LocalDay, startOf } from "../nutrition/localDay";
import { WEIGHT_KG } from "./bodyProfile";

/**
 * The weigh-ins (TASK-489 part K1, ADR-0397 precisazione 8): the weights the
 * user writes, one a day, with how often MuW asks for one, the user's goal
 * weight and milestones, and which congratulations were already shown.
 *
 * Body data: kept for the account signed in (`ownedFile`, like body.json
 * since TASK-507 D), never sent to the server, and never seen by another
 * account on the same phone. A rule-based check, no AI: dates and numbers
 * written on the phone decide when to ask.
 */

/** How often to ask, in weeks; 0 is never. */
export const EVERY_WEEKS = [1, 2, 4, 0] as const;
export type EveryWeeks = (typeof EVERY_WEEKS)[number];
/** The user's choice of 2026-11-24: every 2 weeks to start with. */
export const DEFAULT_EVERY: EveryWeeks = 2;

/** After «Not now», the card stays away this many days. */
export const NOT_NOW_DAYS = 7;

export type WeighIn = { day: LocalDay; kg: number };

export type WeightGoal = {
  /** The goal weight the user wrote. */
  kg: number;
  /** The weight it was set from: the milestones go between the two. */
  fromKg: number;
};

export type WeighIns = {
  /** Oldest first, one a day. */
  entries: readonly WeighIn[];
  every: EveryWeeks;
  /** The day of the last «Not now»; null with none. */
  notNow: LocalDay | null;
  goal: WeightGoal | null;
  /** The user's own milestones, in kilograms. */
  milestones: readonly number[];
  /** The congratulations already shown, by key (weightGoal.ts). */
  celebrated: readonly string[];
};

export const NO_WEIGH_INS: WeighIns = {
  entries: [],
  every: DEFAULT_EVERY,
  notNow: null,
  goal: null,
  milestones: [],
  celebrated: [],
};

export const WEIGH_INS_FILE = "weigh-ins.json";

/** A weight in kilograms as the body takes it (WEIGHT_KG); null otherwise. */
export function weightOf(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= WEIGHT_KG.min &&
    value <= WEIGHT_KG.max
    ? value
    : null;
}

function entriesFrom(data: unknown): WeighIn[] {
  if (!Array.isArray(data)) {
    return [];
  }
  const byDay = new Map<LocalDay, number>();
  for (const item of data) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const raw = item as Record<string, unknown>;
    const kg = weightOf(raw.kg);
    if (isLocalDay(raw.day) && kg !== null) {
      byDay.set(raw.day, kg);
    }
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([day, kg]) => ({ day, kg }));
}

function goalFrom(data: unknown): WeightGoal | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const raw = data as Record<string, unknown>;
  const kg = weightOf(raw.kg);
  const fromKg = weightOf(raw.fromKg);
  return kg === null || fromKg === null ? null : { kg, fromKg };
}

/** What of `data` are weigh-ins: each field that does not read is as new. */
export function weighInsFrom(data: unknown): WeighIns {
  if (typeof data !== "object" || data === null) {
    return NO_WEIGH_INS;
  }
  const raw = data as Record<string, unknown>;
  const every = EVERY_WEEKS.includes(raw.every as EveryWeeks)
    ? (raw.every as EveryWeeks)
    : DEFAULT_EVERY;
  const milestones = Array.isArray(raw.milestones)
    ? [
        ...new Set(
          raw.milestones.map(weightOf).filter((kg): kg is number => kg !== null),
        ),
      ]
    : [];
  const celebrated = Array.isArray(raw.celebrated)
    ? [
        ...new Set(
          raw.celebrated.filter((key): key is string => typeof key === "string"),
        ),
      ]
    : [];
  return {
    entries: entriesFrom(raw.entries),
    every,
    notNow: isLocalDay(raw.notNow) ? raw.notNow : null,
    goal: goalFrom(raw.goal),
    milestones,
    celebrated,
  };
}

/** The latest weigh-in; null with none. */
export function latestOf(weighIns: WeighIns): WeighIn | null {
  return weighIns.entries[weighIns.entries.length - 1] ?? null;
}

/** The weigh-ins with `kg` on `day`: a second one the same day replaces it. */
export function withWeighIn(weighIns: WeighIns, day: LocalDay, kg: number): WeighIns {
  const kept = weightOf(kg);
  if (kept === null || !isLocalDay(day)) {
    return weighIns;
  }
  return {
    ...weighIns,
    entries: entriesFrom([...weighIns.entries, { day, kg: kept }]),
    notNow: null,
  };
}

export function withoutWeighIn(weighIns: WeighIns, day: LocalDay): WeighIns {
  return {
    ...weighIns,
    entries: weighIns.entries.filter((entry) => entry.day !== day),
  };
}

/**
 * Whether «Time to weigh in» shows on `today`: asking is on, the chosen
 * weeks have passed since the last weigh-in (right away before the first),
 * and no «Not now» in the last NOT_NOW_DAYS days.
 */
export function weighInDue(weighIns: WeighIns, today: LocalDay): boolean {
  if (weighIns.every === 0) {
    return false;
  }
  const last = latestOf(weighIns);
  if (last !== null && today < addDays(last.day, weighIns.every * 7)) {
    return false;
  }
  return weighIns.notNow === null || today >= addDays(weighIns.notNow, NOT_NOW_DAYS);
}

/** Whole days from `from` to `to`; 0 for a day that does not read. */
export function daysBetween(from: LocalDay, to: LocalDay): number {
  const a = startOf(from);
  const b = startOf(to);
  if (a === null || b === null) {
    return 0;
  }
  // Noon to noon would be the same: a change of clock is an hour, not a day.
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** How the chart reads the weights. */
export type WeightMode = "kg" | "change" | "percent";

/** A weigh-in in `mode`: kilograms, the change from the first weigh-in, or
 * that change as a percent of the starting weight. */
export function valueIn(mode: WeightMode, kg: number, startKg: number): number {
  if (mode === "kg") {
    return kg;
  }
  const change = kg - startKg;
  return mode === "change" ? change : (change / startKg) * 100;
}

/** How far back the chart looks. */
export type WeightRange = "weeks" | "months" | "all";

/** The first day a range shows from `today`; null for all. */
export function rangeStart(range: WeightRange, today: LocalDay): LocalDay | null {
  if (range === "weeks") {
    return addDays(today, -12 * 7);
  }
  return range === "months" ? addDays(today, -365) : null;
}

export type WeightStats = {
  start: WeighIn;
  latest: WeighIn;
  highestKg: number;
  lowestKg: number;
  /** latest − start. */
  changeKg: number;
  /** The change as a percent of the starting weight. */
  changePercent: number;
  /** Days from the first weigh-in to the latest. */
  days: number;
  /** The change a week on average; null under a week. */
  perWeekKg: number | null;
  count: number;
};

/** The numbers of the weight page, over all the weigh-ins; null with none. */
export function weightStats(weighIns: WeighIns): WeightStats | null {
  const { entries } = weighIns;
  const start = entries[0];
  const latest = latestOf(weighIns);
  if (start === undefined || latest === null) {
    return null;
  }
  const kgs = entries.map((entry) => entry.kg);
  const days = daysBetween(start.day, latest.day);
  const changeKg = latest.kg - start.kg;
  return {
    start,
    latest,
    highestKg: Math.max(...kgs),
    lowestKg: Math.min(...kgs),
    changeKg,
    changePercent: (changeKg / start.kg) * 100,
    days,
    perWeekKg: days < 7 ? null : changeKg / (days / 7),
    count: entries.length,
  };
}

/** Whole weeks in `days`, to the nearest. */
export function weeksIn(days: number): number {
  return Math.round(days / 7);
}

/** The weigh-ins of the account signed in; none when none were kept or the
 * file does not read. */
export function loadWeighIns(): WeighIns {
  try {
    const file = ownedFile(WEIGH_INS_FILE);
    return file.exists ? weighInsFrom(JSON.parse(file.textSync())) : NO_WEIGH_INS;
  } catch {
    return NO_WEIGH_INS;
  }
}

let current: WeighIns | null = null;
const listeners = new Set<() => void>();

/** The weigh-ins now; read from the phone on first use. */
export function appWeighIns(): WeighIns {
  if (current === null) {
    current = loadWeighIns();
  }
  return current;
}

function tell(): void {
  for (const listener of listeners) {
    listener();
  }
}

// Another account signed in, or none (TASK-507): its own weigh-ins.
onOwnerChange(() => {
  current = loadWeighIns();
  tell();
});

export function subscribeWeighIns(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Keeps the weigh-ins for the account signed in; whether the phone kept
 * them. A phone that refuses still has them until the app closes. */
export function saveWeighIns(weighIns: WeighIns): boolean {
  const kept = weighInsFrom(weighIns);
  current = kept;
  tell();
  try {
    const file = ownedFile(WEIGH_INS_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify(kept));
    return true;
  } catch {
    return false;
  }
}

/** Forgets what was read: for the tests, which each start from their files. */
export function forgetWeighIns(): void {
  current = null;
  tell();
}
