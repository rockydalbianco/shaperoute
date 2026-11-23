import { useSyncExternalStore } from "react";

import { dayOf, type Diary, diaryOfMonth, diaryWithDay, eatenAsPlanned } from "./diary";
import type { Food } from "./foods";
import { type LocalDay, monthOf, type Weekday } from "./localDay";
import {
  loadDiaryMonth,
  loadOwnFoods,
  loadPlan,
  loadSettings,
  type NutritionSettings,
  saveDiaryMonth,
  saveOwnFoods,
  savePlan,
  saveSettings,
} from "./nutritionStore";
import {
  addOwnFood,
  changeOwnFood,
  type OwnFoodFields,
  type OwnFoods,
  removeOwnFood,
} from "./ownFoods";
import { targetOf } from "./ownTarget";
import {
  copyDay,
  type DayMeals,
  NO_MEALS,
  planWithDay,
  planWithFood,
  type WeekPlan,
} from "./plan";

/**
 * What «Nutrition» holds while the app is open (TASK-489 part B, ADR-0397):
 * the user's foods, their plan, their settings and the months of the diary
 * that were looked at, read from the phone once and written back at every
 * change (nutritionStore.ts). One copy for the whole app: the page opened
 * from the sport panel and the «Food» tab of the training mode show the
 * same day.
 *
 * Nothing here leaves the phone.
 */

type State = {
  readonly settings: NutritionSettings;
  readonly ownFoods: OwnFoods;
  readonly plan: WeekPlan;
};

let state: State | null = null;
/** The months of the diary read so far, by «YYYY-MM». */
const months = new Map<string, Diary>();
const listeners = new Set<() => void>();

function current(): State {
  state ??= {
    settings: loadSettings(),
    ownFoods: loadOwnFoods(),
    plan: loadPlan(),
  };
  return state;
}

function change(next: State): void {
  state = next;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The month of the diary, read from the phone the first time it is asked. */
function monthOfDiary(month: string): Diary {
  let diary = months.get(month);
  if (diary === undefined) {
    diary = loadDiaryMonth(month);
    months.set(month, diary);
  }
  return diary;
}

/** What was written on `day`; no portion in any meal for a day with nothing. */
export function mealsOn(day: LocalDay): DayMeals {
  return dayOf(monthOfDiary(monthOf(day)), day) ?? NO_MEALS;
}

/** `meals` become the whole of `day`; false when the phone did not keep it. */
export function writeDay(day: LocalDay, meals: DayMeals): boolean {
  const month = monthOf(day);
  const diary = diaryOfMonth(diaryWithDay(monthOfDiary(month), day, meals), month);
  months.set(month, diary);
  change({ ...current() });
  return saveDiaryMonth(month, diary);
}

/**
 * «Eaten as planned»: `day` becomes what the plan has for its day of the
 * week, as the plan is now. Nothing changes with nothing planned that day.
 */
export function writeDayAsPlanned(day: LocalDay): boolean {
  const month = monthOf(day);
  const before = monthOfDiary(month);
  const diary = diaryOfMonth(eatenAsPlanned(before, day, current().plan), month);
  if (diary[day] === before[day]) {
    return true;
  }
  months.set(month, diary);
  change({ ...current() });
  return saveDiaryMonth(month, diary);
}

function writePlan(plan: WeekPlan): boolean {
  change({ ...current(), plan });
  return savePlan(plan);
}

/** `meals` become what the plan has for `weekday`. */
export function writePlanDay(weekday: Weekday, meals: DayMeals): boolean {
  return writePlan(planWithDay(current().plan, weekday, meals));
}

/** The plan of `from` written over the one of `to`. */
export function copyPlanDay(from: Weekday, to: Weekday): boolean {
  return writePlan(copyDay(current().plan, from, to));
}

function writeSettings(settings: NutritionSettings): boolean {
  change({ ...current(), settings });
  return saveSettings(settings);
}

/** «I understand»: the notice is not shown again. */
export function seeNotice(): boolean {
  return writeSettings({ ...current().settings, noticeSeen: true });
}

/**
 * «My daily target» as the user wrote it, or none with null. False when
 * `kcal` is not a target (ownTarget.ts): nothing changes then.
 */
export function writeTarget(kcal: number | null): boolean {
  const target = kcal === null ? null : targetOf(kcal);
  if (kcal !== null && target === null) {
    return false;
  }
  writeSettings({ ...current().settings, target });
  return true;
}

/** A new food of the user's; null when its name or numbers make no sense. */
export function addFood(fields: OwnFoodFields): Food | null {
  const now = current();
  const added = addOwnFood(now.ownFoods, fields);
  if (added === null) {
    return null;
  }
  change({ ...now, ownFoods: added.own });
  saveOwnFoods(added.own);
  return added.food;
}

/**
 * A food of the user's rewritten. The plan counts with it from here on;
 * the days already in the diary keep the food as it was (plan.ts).
 */
export function changeFood(key: string, fields: OwnFoodFields): Food | null {
  const now = current();
  const changed = changeOwnFood(now.ownFoods, key, fields);
  if (changed === null) {
    return null;
  }
  const plan = planWithFood(now.plan, changed.food);
  change({ ...now, ownFoods: changed.own, plan });
  saveOwnFoods(changed.own);
  savePlan(plan);
  return changed.food;
}

/** A food of the user's taken out of the list: plan and diary keep the
 * portions that were written with it. */
export function removeFood(key: string): void {
  const now = current();
  const ownFoods = removeOwnFood(now.ownFoods, key);
  change({ ...now, ownFoods });
  saveOwnFoods(ownFoods);
}

/** Forgets what was read, so that the next look reads the phone again: for
 * the tests, which each start from their own files. */
export function forgetNutrition(): void {
  state = null;
  months.clear();
  for (const listener of listeners) {
    listener();
  }
}

export type Nutrition = {
  settings: NutritionSettings;
  ownFoods: OwnFoods;
  plan: WeekPlan;
  /** What was written on a day, as it is now. */
  mealsOn: (day: LocalDay) => DayMeals;
};

/** «Nutrition» as it is now; the component is drawn again when it changes. */
export function useNutrition(): Nutrition {
  const now = useSyncExternalStore(subscribe, current, current);
  return {
    settings: now.settings,
    ownFoods: now.ownFoods,
    plan: now.plan,
    mealsOn,
  };
}
