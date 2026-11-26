import { File, Paths } from "expo-file-system";

import { type Diary, diaryFrom, diaryOfMonth } from "./diary";
import { type EnergyEdits, energyEditsFrom, NO_EDITS } from "./energyEdits";
import { type OwnFoods, ownFoodsFrom } from "./ownFoods";
import { type OwnRecipes, ownRecipesFrom } from "./ownRecipes";
import { targetOf } from "./ownTarget";
import { isEmptyPlan, planFrom, type WeekPlan } from "./plan";
import { type Purpose, purposeOf } from "./targetEstimate";

/**
 * Where «Nutrition» is kept (TASK-489, ADR-0397): only on this phone (the
 * user's choice, «Prima solo sul telefono»), as files of the app's
 * documents, like the body (body/bodyProfile.ts). Nothing here goes to the
 * server. What MuW reads from Apple Health is never written here: it is
 * read again when it is needed.
 *
 * The diary is a file a month, so a day's change rewrites a month and not
 * the years before it.
 */

export const OWN_FOODS_FILE = "nutrition-foods.json";
export const PLAN_FILE = "nutrition-plan.json";
export const SETTINGS_FILE = "nutrition-settings.json";
/** The recipes as the user changed them (part L). */
export const RECIPES_FILE = "nutrition-recipes.json";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** The file of the diary of `month` («2026-11»). */
export function diaryFile(month: string): string {
  return `nutrition-diary-${month}.json`;
}

/** What is kept beside foods, plan and diary. */
export type NutritionSettings = {
  /** The user has read «Before you start» and tapped «I understand». */
  noticeSeen: boolean;
  /** «My daily target», written by the user; null with none (ownTarget.ts). */
  target: number | null;
  /** The energy the user corrected by hand (energyEdits.ts). */
  edits: EnergyEdits;
  /** The invitation at the end of an activity (part I). */
  invite: Invite;
  /** Why the user is here, as they said at the door (part J); null when
   * they skipped the question. */
  purpose: Purpose | null;
};

/** How often the invitation to «Nutrition» was shown, and whether the user
 * said «Not now»: then it is not shown again. */
export type Invite = { seen: number; off: boolean };

export const NO_INVITE: Invite = { seen: 0, off: false };

/** What of `data` is an invitation's count: anything else is as new. */
function inviteFrom(data: unknown): Invite {
  if (typeof data !== "object" || data === null) {
    return NO_INVITE;
  }
  const raw = data as Record<string, unknown>;
  const seen = raw.seen;
  return {
    seen: typeof seen === "number" && Number.isInteger(seen) && seen > 0 ? seen : 0,
    off: raw.off === true,
  };
}

export const NO_SETTINGS: NutritionSettings = {
  noticeSeen: false,
  target: null,
  edits: NO_EDITS,
  invite: NO_INVITE,
  purpose: null,
};

/** What of `data` are the settings: a field that does not read is as new. */
export function settingsFrom(data: unknown): NutritionSettings {
  if (typeof data !== "object" || data === null) {
    return NO_SETTINGS;
  }
  const raw = data as Record<string, unknown>;
  return {
    noticeSeen: raw.noticeSeen === true,
    target: targetOf(raw.target),
    edits: energyEditsFrom(raw.edits),
    invite: inviteFrom(raw.invite),
    purpose: purposeOf(raw.purpose),
  };
}

/** What the file `name` holds; null when there is none or it does not read. */
function read(name: string): unknown {
  try {
    const file = new File(Paths.document, name);
    return file.exists ? (JSON.parse(file.textSync()) as unknown) : null;
  } catch {
    return null;
  }
}

/** Keeps `value` in the file `name`, or removes the file for null. Whether
 * the phone kept it: a full phone refuses, and what is on the screen then
 * holds only while the app is open. */
function write(name: string, value: unknown): boolean {
  try {
    const file = new File(Paths.document, name);
    if (value === null) {
      if (file.exists) {
        file.delete();
      }
    } else {
      file.create({ overwrite: true });
      file.write(JSON.stringify(value));
    }
    return true;
  } catch {
    return false;
  }
}

export function loadOwnFoods(): OwnFoods {
  return ownFoodsFrom(read(OWN_FOODS_FILE));
}

/** The counter of the keys is kept even with no food left: a key is never
 * given twice. */
export function saveOwnFoods(own: OwnFoods): boolean {
  return write(OWN_FOODS_FILE, ownFoodsFrom(own));
}

export function loadPlan(): WeekPlan {
  return planFrom(read(PLAN_FILE));
}

/** An empty plan removes the file. */
export function savePlan(plan: WeekPlan): boolean {
  const kept = planFrom(plan);
  return write(PLAN_FILE, isEmptyPlan(kept) ? null : kept);
}

export function loadSettings(): NutritionSettings {
  return settingsFrom(read(SETTINGS_FILE));
}

export function saveSettings(settings: NutritionSettings): boolean {
  return write(SETTINGS_FILE, settingsFrom(settings));
}

/** The days of `month` kept on this phone; none for a month that is not
 * one. */
export function loadDiaryMonth(month: string): Diary {
  return MONTH.test(month)
    ? diaryOfMonth(diaryFrom(read(diaryFile(month))), month)
    : {};
}

/** Keeps the days of `diary` that are in `month` as that month's file; a
 * month with no day written removes it. */
export function saveDiaryMonth(month: string, diary: Diary): boolean {
  if (!MONTH.test(month)) {
    return false;
  }
  const kept = diaryOfMonth(diaryFrom(diary), month);
  return write(diaryFile(month), Object.keys(kept).length === 0 ? null : kept);
}

export function loadOwnRecipes(): OwnRecipes {
  return ownRecipesFrom(read(RECIPES_FILE));
}

/** No recipe changed removes the file. */
export function saveOwnRecipes(own: OwnRecipes): boolean {
  const kept = ownRecipesFrom(own);
  return write(RECIPES_FILE, Object.keys(kept).length === 0 ? null : kept);
}
