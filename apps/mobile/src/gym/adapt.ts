import {
  MAX_GYM_ADAPT_STEPS,
  type GymPlanAdaptDay,
  type GymPlanFeel,
  type GymPlanItem,
  type GymPlanSession,
  type GymProgram,
} from "@shaperoute/shared-types";

import { weightLabel } from "../body/bodyUnits";
import { t, tLater, tPlural } from "../i18n";
import type { Language } from "../i18n/languages";
import { clockLabel } from "../navigation/freeRun";
import type { Units } from "../units/units";
import { exerciseName } from "./catalog";
import type { KeptPlan } from "./plans";
import { cycleWeekOf, sessionOn, sessionsOfWeek } from "./program";
import { RUN_NAMES } from "./proposal";
import { runAmount } from "./runDay";
import { isTargetDay } from "./targetWeeks";

/**
 * The plan that adapts to how its workouts went (TASK-488, ADR-0396; the
 * user's choices of 2026-11-22 on the canvas, row H): at the end of a
 * workout of the plan, «How did it go?», once, for all of that day. «Easy»
 * one step more than the mode's; «Right» as planned; «Hard» the same next
 * time; a second «Hard» in a row one step back. The steps go in
 * `program.adapt`, kept with the plan, and program.ts adds them to every
 * week it works out for that day. On for every plan, turned off in «My
 * plans».
 */

/** The three answers, in order. */
export const FEELS: readonly { feel: GymPlanFeel; title: string; note: string }[] = [
  { feel: "easy", title: tLater("Easy@@feel"), note: tLater("could do more") },
  { feel: "right", title: tLater("Right@@feel"), note: tLater("as planned") },
  { feel: "hard", title: tLater("Hard@@feel"), note: tLater("at my limit") },
];

/** Whether the plan asks at the end of its workouts: on unless turned off. */
export function adapts(program: GymProgram): boolean {
  return program.adapt?.off !== true;
}

/** A day that adapts: a workout of the gym or a run day; not a day out of
 * another sport, nor a day of the target's ladder, which keep their own
 * steps to the target's day. */
export function canAdapt(program: GymProgram, session: GymPlanSession): boolean {
  if (session.outing !== undefined) {
    return false;
  }
  if (program.target !== undefined && isTargetDay(session, program.target)) {
    return false;
  }
  return session.items.length > 0 || session.run !== undefined;
}

/** Whether the mode makes the day heavier from one week to the next: «Hard»
 * holds that step back. */
function grows(program: GymProgram, session: GymPlanSession): boolean {
  return session.run !== undefined
    ? program.mode !== "same"
    : program.mode === "load" || program.mode === "reps";
}

/** The day as it is after `feel`. */
export function answerDay(
  program: GymProgram,
  session: GymPlanSession,
  feel: GymPlanFeel,
): GymPlanAdaptDay {
  const was = program.adapt?.days.find((one) => one.day === session.day);
  let steps = was?.steps ?? 0;
  let hard = was?.hard ?? 0;
  if (feel === "easy") {
    steps += 1;
    hard = 0;
  } else if (feel === "right") {
    hard = 0;
  } else {
    // The same next time; after a «Hard» already, one step back as well.
    steps -= (grows(program, session) ? 1 : 0) + (hard >= 1 ? 1 : 0);
    hard = Math.min(2, hard + 1);
  }
  return {
    day: session.day,
    steps: Math.max(-MAX_GYM_ADAPT_STEPS, Math.min(MAX_GYM_ADAPT_STEPS, steps)),
    hard,
    last: feel,
  };
}

/** The program after `feel` for the day of `session`. */
export function answered(
  program: GymProgram,
  session: GymPlanSession,
  feel: GymPlanFeel,
): GymProgram {
  const day = answerDay(program, session, feel);
  const others = (program.adapt?.days ?? []).filter((one) => one.day !== session.day);
  return {
    ...program,
    adapt: {
      off: program.adapt?.off ?? false,
      days: [...others, day].sort((a, b) => a.day - b.day),
    },
  };
}

/** The program turned on or off; its answers stay for when it is on again. */
export function withAdapt(program: GymProgram, on: boolean): GymProgram {
  return { ...program, adapt: { off: !on, days: program.adapt?.days ?? [] } };
}

/** The mark beside a day in «My plans»: ↑ a step more, = held, ↓ a step
 * back; none for a day answered «Right» or not at all, or a plan turned off. */
export function markOf(program: GymProgram, day: number): "↑" | "=" | "↓" | null {
  if (!adapts(program)) {
    return null;
  }
  const one = program.adapt?.days.find((each) => each.day === day);
  if (one === undefined || one.last === "right") {
    return null;
  }
  return one.last === "easy" ? "↑" : one.hard >= 2 ? "↓" : "=";
}

/** The heading over what changes: «Easy: up we go»… */
export function answerTitle(day: GymPlanAdaptDay): string {
  switch (day.last) {
    case "easy":
      return t("Easy: up we go");
    case "right":
      return t("Right: as planned");
    case "hard":
      return day.hard >= 2
        ? t("Hard again: one step back")
        : t("Hard: the same next time");
  }
}

/** A line of what changes next time: «Bench press», «60 → 65 kg». */
export type NextLine = { name: string; was: string; next: string };

const DAY_MS = 24 * 60 * 60 * 1000;

function amountOf(item: GymPlanItem, units: Units): string {
  if (item.load_kg !== undefined && item.load_kg > 0) {
    return weightLabel(item.load_kg, units);
  }
  if (item.reps !== undefined) {
    return tPlural(item.reps, "{count} rep", "{count} reps");
  }
  return item.duration_s === undefined ? "" : clockLabel(item.duration_s * 1000);
}

/**
 * What the day of `session` is next week in `after`, beside what it was on
 * `date` in `program`: up to three lines, the ones that change first; a run
 * day one line. Empty before the plan starts, and when nothing changes.
 */
export function nextTime(
  program: GymProgram,
  after: GymProgram,
  day: number,
  date: Date,
  units: Units,
  language: Language,
): NextLine[] {
  const now = cycleWeekOf(program, date);
  const next = cycleWeekOf(after, new Date(date.getTime() + 7 * DAY_MS));
  if (now === null || next === null) {
    return [];
  }
  const was = sessionsOfWeek(program, now.week, now.cycle).find(
    (one) => one.day === day,
  );
  const then = sessionsOfWeek(after, next.week, next.cycle).find(
    (one) => one.day === day,
  );
  if (was === undefined || then === undefined) {
    return [];
  }
  if (was.run !== undefined && then.run !== undefined) {
    return [
      {
        name: t(RUN_NAMES[then.run.kind]),
        was: runAmount(was.run),
        next: runAmount(then.run),
      },
    ];
  }
  const lines = then.items.flatMap((item, index): NextLine[] => {
    const before = was.items[index];
    if (before === undefined) {
      return [];
    }
    const name = exerciseName(
      item.exercise !== undefined
        ? { exercise: item.exercise }
        : { name: item.name ?? "" },
      language,
    );
    return [{ name, was: amountOf(before, units), next: amountOf(item, units) }];
  });
  const changed = lines.filter((line) => line.was !== line.next);
  return [...changed, ...lines.filter((line) => line.was === line.next)].slice(0, 3);
}

/** A day of a plan the answer is for. */
export type AdaptDay = { plan: KeptPlan; program: GymProgram; session: GymPlanSession };

/**
 * The day of a plan a workout (or a run) begun at `date` was: of the plan
 * `key` the workout followed, or, for a run, of the first plan with a run
 * day then. Null when no plan that adapts has one that can (canAdapt).
 */
export function adaptDayOf(
  plans: readonly KeptPlan[],
  date: Date,
  kind: "gym" | "run",
  key?: string | null,
): AdaptDay | null {
  for (const plan of plans) {
    const program = plan.program;
    if (
      (key !== undefined && plan.key !== key) ||
      program == null ||
      !adapts(program)
    ) {
      continue;
    }
    const found = sessionOn(program, date);
    if (
      found !== null &&
      canAdapt(program, found.session) &&
      (kind === "run") === (found.session.run !== undefined)
    ) {
      return { plan, program, session: found.session };
    }
  }
  return null;
}

/** Whether next week, after `date`, is the cycle's lighter one (a cycle of
 * 3 weeks or more that grows): what changes may then be less, to recover. */
export function lighterNext(program: GymProgram, date: Date): boolean {
  const next = cycleWeekOf(program, new Date(date.getTime() + 7 * DAY_MS));
  return (
    next !== null &&
    program.mode !== "same" &&
    program.weeks >= 3 &&
    next.week === program.weeks
  );
}
