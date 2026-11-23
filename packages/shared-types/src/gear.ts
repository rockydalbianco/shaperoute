import type { RunActivity } from "./index.ts";

/**
 * A member's gear (TASK-486, ADR-0393, docs/API.md, «Gear»): shoes, a
 * bike, skis, a helmet, a harness, a sail, anything, with its brand, a
 * model, a name of its own, the day it was bought, a note and a photo.
 * Its totals are the server's metres and seconds of the activities it went
 * on. Mirrors services/api/shaperoute_api/gear.py.
 */

/** The kinds, in the order the app groups them; `GearKind` in gear.py. */
export const GEAR_KINDS = [
  "shoes",
  "bike",
  "skis",
  "ski_boots",
  "snowboard",
  "poles",
  "boots",
  "climbing_shoes",
  "harness",
  "helmet",
  "rope",
  "crampons",
  "ice_axe",
  "snowshoes",
  "inline_skates",
  "sail",
  "board",
  "paddle",
  "boat",
  "wetsuit",
  "paraglider",
  "wheelchair",
  "clothing",
  "backpack",
  "watch",
  "other",
] as const;
export type GearKind = (typeof GEAR_KINDS)[number];

export const GEAR_MAX_ITEMS = 200;
export const GEAR_MAX_ON_ACTIVITY = 10;
export const GEAR_MAX_BRAND = 40;
export const GEAR_MAX_MODEL = 80;
export const GEAR_MAX_NAME = 40;
export const GEAR_MAX_NOTE = 500;
export const GEAR_MIN_LIMIT_M = 1_000;
export const GEAR_MAX_LIMIT_M = 100_000_000;

/** The server's sums of the activities an item went on. */
export interface GearTotals {
  distance_m: number;
  duration_s: number;
  activities: number;
}

/**
 * An item. `off_profile`, `limit_m`, `defaults` and `hidden` come only to
 * its owner; absent for the others, as the optional words when empty.
 */
export interface Gear {
  id: string;
  kind: GearKind;
  brand: string;
  model?: string;
  name?: string;
  /** "YYYY-MM-DD". */
  bought_on?: string;
  note?: string;
  /** Where GET reads the photo (with the token), its version in `?v=`. */
  photo_url?: string;
  retired: boolean;
  totals: GearTotals;
  created_at: string;
  off_profile?: boolean;
  limit_m?: number;
  defaults?: RunActivity[];
  /** Hidden by whoever runs MuW after a report. */
  hidden?: boolean;
}

/** GET /me/gear, GET /users/{id}/gear, the gear of an activity. */
export interface GearList {
  gear: Gear[];
}

/** POST /me/gear and PUT /me/gear/{id}: the whole item. */
export interface GearRequest {
  kind: GearKind;
  brand: string;
  model?: string | null;
  name?: string | null;
  bought_on?: string | null;
  note?: string | null;
  limit_m?: number | null;
  off_profile?: boolean;
  retired?: boolean;
  defaults?: RunActivity[];
}

/** PUT /me/activities/{key}/gear: the whole list of the activity. */
export interface ActivityGearRequest {
  gear_ids: string[];
}
