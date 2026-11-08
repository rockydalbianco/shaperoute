import type { SkiDayRequest, SnowType } from "@shaperoute/shared-types";
import { SKI_GEAR_MAX, SNOW_TYPES } from "@shaperoute/shared-types";
import { File, Paths } from "expo-file-system";

import { activityKey } from "../activities/activityKey";
import type { SavedRun } from "../navigation/trackStore";

/**
 * What the skier gives of a day of skiing (TASK-406 part D2, ADR-0338), on
 * the phone: the resort chosen while skiing, the snow and the gear chosen at
 * the end, and the days saved whose choices still have to reach the API. The
 * gear is remembered for the next day (the user's choice, question 2). One
 * file for the phone: the gear only fills the field, nothing is sent with it
 * until a day is saved.
 */

export const SKI_DAY_FILE = "ski-day.json";

/** A resort chosen this long ago belongs to another day. */
export const DAY_MS = 18 * 60 * 60 * 1000;
/** A day whose choices the API still refuses as unknown is let go. */
export const PENDING_MS = 7 * 24 * 60 * 60 * 1000;

export type DayResort = { id: string; name: string; at: number };
export type PendingSkiDay = { key: string; request: SkiDayRequest; at: number };

type Kept = {
  resort: DayResort | null;
  snow: SnowType | null;
  gear: string;
  pending: PendingSkiDay[];
};

const EMPTY: Kept = { resort: null, snow: null, gear: "", pending: [] };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const snowOf = (value: unknown): SnowType | null =>
  SNOW_TYPES.find((snow) => snow === value) ?? null;

function resortOf(value: unknown): DayResort | null {
  return isObject(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.at === "number"
    ? { id: value.id, name: value.name, at: value.at }
    : null;
}

function pendingOf(value: unknown): PendingSkiDay[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item): PendingSkiDay[] => {
    if (
      !isObject(item) ||
      typeof item.key !== "string" ||
      typeof item.at !== "number"
    ) {
      return [];
    }
    const request = isObject(item.request) ? item.request : {};
    return [
      {
        key: item.key,
        at: item.at,
        request: {
          resort_id: typeof request.resort_id === "string" ? request.resort_id : null,
          gear: typeof request.gear === "string" ? request.gear : null,
          snow: snowOf(request.snow),
        },
      },
    ];
  });
}

function load(): Kept {
  try {
    const file = new File(Paths.document, SKI_DAY_FILE);
    if (!file.exists) {
      return EMPTY;
    }
    const data: unknown = JSON.parse(file.textSync());
    if (!isObject(data)) {
      return EMPTY;
    }
    return {
      resort: resortOf(data.resort),
      snow: snowOf(data.snow),
      gear: typeof data.gear === "string" ? data.gear : "",
      pending: pendingOf(data.pending),
    };
  } catch {
    return EMPTY;
  }
}

const listeners = new Set<() => void>();

function save(kept: Kept): void {
  try {
    const file = new File(Paths.document, SKI_DAY_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify(kept));
  } catch {
    // The day goes on with what the file still says.
  }
  for (const listener of listeners) {
    listener();
  }
}

/** Told after every change: the outbox sends what was just queued. */
export function onSkiDayChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The resort of the day in progress; null for none, or one of another day. */
export function loadDayResort(now: number = Date.now()): DayResort | null {
  const { resort } = load();
  return resort !== null && now - resort.at < DAY_MS ? resort : null;
}

export function saveDayResort(resort: { id: string; name: string }, now = Date.now()) {
  save({ ...load(), resort: { id: resort.id, name: resort.name, at: now } });
}

export function loadSnow(): SnowType | null {
  return load().snow;
}

/** One or none: the same twice takes it away. */
export function saveSnow(snow: SnowType | null): void {
  save({ ...load(), snow });
}

/** The gear of the last day, or what is being written now. */
export function loadGear(): string {
  return load().gear;
}

export function saveGear(gear: string): void {
  save({ ...load(), gear: gear.slice(0, SKI_GEAR_MAX) });
}

/** What `kept` would send: null when the skier gave nothing. */
export function requestOf(kept: {
  resort: DayResort | null;
  snow: SnowType | null;
  gear: string;
}): SkiDayRequest | null {
  const gear = kept.gear.split(/\s+/).filter(Boolean).join(" ");
  const request: SkiDayRequest = {
    resort_id: kept.resort?.id ?? null,
    gear: gear === "" ? null : gear,
    snow: kept.snow,
  };
  return request.resort_id === null && request.gear === null && request.snow === null
    ? null
    : request;
}

/**
 * «Save» of a day on the snow: its choices wait for the day to reach the API,
 * then go with PUT /me/activities/{key}/ski (useSkiDayOutbox). The resort and
 * the snow are of this day only; the gear stays for the next.
 */
export function queueSkiDay(run: SavedRun, now: number = Date.now()): void {
  const kept = load();
  const first = run.track.fixes[0];
  const resort =
    kept.resort !== null && now - kept.resort.at < DAY_MS ? kept.resort : null;
  const request = requestOf({ ...kept, resort });
  if (first === undefined || request === null) {
    return;
  }
  const key = activityKey(first);
  save({
    ...kept,
    pending: [
      ...kept.pending.filter((day) => day.key !== key),
      { key, request, at: now },
    ],
  });
}

/** The day is over, saved or not: its resort and snow go, the gear stays. */
export function clearSkiDay(): void {
  const kept = load();
  if (kept.resort !== null || kept.snow !== null) {
    save({ ...kept, resort: null, snow: null });
  }
}

export function loadPending(): PendingSkiDay[] {
  return load().pending;
}

/** Sent, refused for good, or too old: no more tries. */
export function dropPending(key: string): void {
  const kept = load();
  save({ ...kept, pending: kept.pending.filter((day) => day.key !== key) });
}
