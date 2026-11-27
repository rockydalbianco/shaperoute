/**
 * What «Today» proposes on the stretching home (TASK-520, ADR-0415), by the
 * rule the user approved on 2026-11-27. The first that holds:
 *
 * 1. an activity of a sport that has stretches ended in the last three
 *    hours: that sport's «After»;
 * 2. before 10 in the morning: «Morning»;
 * 3. from 9 in the evening: «Bedtime»;
 * 4. a working day between 10 and 18: «Desk break»;
 * 5. otherwise «Full body».
 *
 * The answer is a category's key (`categories.ts`); its length and the rest
 * are that category's first choice. Pure: the time and the last activity
 * are given, so that the same moment always proposes the same thing.
 */

/** How long after an activity its «After» is still what to do. */
export const AFTER_SPORT_MS = 3 * 60 * 60 * 1000;

/**
 * The stretching sport of each of the app's sports that has one. Sports the
 * app records and the list of stretches does not have (paragliding, a walk)
 * are not here: after them the hour decides.
 */
export const STRETCH_SPORT: Readonly<Record<string, string>> = {
  running: "running",
  cycling: "cycling",
  gravel_biking: "cycling",
  mountain_biking: "cycling",
  swimming: "swimming",
  skiing: "skiing",
  snowboarding: "snowboarding",
  ski_touring: "skiTouring",
  gym: "gym",
  hiking: "hiking",
  paddling: "paddling",
};

/** The last activity done: its sport, as the app names it, and when it ended. */
export type LastActivity = { sport: string; endedAt: number };

/** The category «Today» proposes at `now`, on the phone's own clock. */
export function todayCategory(now: Date, last?: LastActivity | null): string {
  if (last !== undefined && last !== null) {
    const sport = STRETCH_SPORT[last.sport];
    const since = now.getTime() - last.endedAt;
    if (sport !== undefined && since >= 0 && since <= AFTER_SPORT_MS) {
      return `${sport}.after`;
    }
  }
  const hour = now.getHours();
  if (hour < 10) {
    return "morning";
  }
  if (hour >= 21) {
    return "bedtime";
  }
  const day = now.getDay();
  if (day >= 1 && day <= 5 && hour < 18) {
    return "desk";
  }
  return "fullBody";
}
