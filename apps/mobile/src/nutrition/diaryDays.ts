import { Directory, Paths } from "expo-file-system";

import type { Diary } from "./diary";
import { intakeOf } from "./intake";
import { loadDiaryMonth } from "./nutritionStore";

/**
 * How many days the diary has something written on (TASK-489 part K1): for
 * the congratulations on keeping at it (weightGoal.ts). Read from the
 * diary's files of the month on this phone, as «Nutrition» keeps them.
 */

const DIARY_FILE = /^nutrition-diary-(\d{4}-(0[1-9]|1[0-2]))\.json$/;

/** The months of the files `names`, as `nutritionStore.diaryFile` names
 * them; other files are not months. */
export function diaryMonths(names: readonly string[]): string[] {
  const months: string[] = [];
  for (const name of names) {
    const month = DIARY_FILE.exec(name)?.[1];
    if (month !== undefined) {
      months.push(month);
    }
  }
  return months.sort();
}

/** The days of `months` with something written, each month read by `load`. */
export function countDiaryDays(
  months: readonly string[],
  load: (month: string) => Diary,
): number {
  let days = 0;
  for (const month of months) {
    for (const meals of Object.values(load(month))) {
      if (intakeOf(meals) !== null) {
        days += 1;
      }
    }
  }
  return days;
}

/** The days of the diary kept on this phone; 0 when the folder does not
 * read. */
export function diaryDaysOnPhone(): number {
  try {
    const names = new Directory(Paths.document).list().map((item) => item.name);
    return countDiaryDays(diaryMonths(names), loadDiaryMonth);
  } catch {
    return 0;
  }
}
