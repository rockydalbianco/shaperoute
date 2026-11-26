import type { GymPlanItem, GymPlanSession, GymProgram } from "@shaperoute/shared-types";

import { t } from "../i18n";
import type { Language } from "../i18n/languages";
import { exerciseName } from "./catalog";
import { kgText } from "./GymPlanWizard";
import { outingAmount, outingName } from "./outingDay";
import { WEEK_DAYS } from "./planLimits";
import { cycleWeekOf, sessionsOfWeek } from "./program";
import { dayLetter, isGymDay } from "./proposal";
import { runAmount } from "./runDay";
import { setsLabel } from "./SessionEditor";
import { SPORT_BADGES, sportOfSession } from "./SportsDoor";

/** What a box of the table says: «4 × 10» and the kg, when it has them. */
export type TableCell = { amount: string; kg: string | null };

/** An exercise (or a day's run, or its outing) through the weeks: null in a
 * week without it. */
export type TableRow = { key: string; label: string; cells: (TableCell | null)[] };

/** A workout of the week: its tab («A · Mon», «Run · Tue») and its rows. */
export type TableTab = { day: number; label: string; rows: TableRow[] };

/** The whole plan on one page (TASK-506 A): the weeks of the cycle in
 * progress, one tab a workout, one row an exercise, one column a week. */
export type PlanTable = {
  weeks: number;
  /** The week of the cycle today; null before the plan starts. */
  now: number | null;
  /** Each week (index 0 is week 1): the lighter one of the cycle. */
  lighter: boolean[];
  /** Each week: written by hand in place of the one worked out. */
  byHand: boolean[];
  tabs: TableTab[];
};

/** The last week of a cycle of 3 or more is the lighter one, as the guide's
 * bars say: with more load each week, or more reps without the gym's kg. */
function isLighter(program: GymProgram, week: number, byHand: boolean): boolean {
  const gym = program.sessions.some(isGymDay);
  return (
    !byHand &&
    program.weeks >= 3 &&
    week === program.weeks &&
    (program.mode === "load" || (!gym && program.mode === "reps"))
  );
}

function cellOfItem(item: GymPlanItem): TableCell {
  return {
    amount: setsLabel(item),
    kg: item.load_kg === undefined ? null : kgText(item.load_kg),
  };
}

/** The rows of the workouts on `day`, week after week: an exercise by its
 * key (the second time it is in the same workout, its own row), in the
 * order they first come; a run day or a day out is one row. */
function rowsOf(
  byWeek: (GymPlanSession | undefined)[],
  language: Language,
): TableRow[] {
  const rows: TableRow[] = [];
  const find = (key: string, label: string): TableRow => {
    let row = rows.find((one) => one.key === key);
    if (row === undefined) {
      row = { key, label, cells: byWeek.map(() => null) };
      rows.push(row);
    }
    return row;
  };
  byWeek.forEach((session, week) => {
    if (session === undefined) {
      return;
    }
    if (session.run !== undefined) {
      find("run", session.name).cells[week] = {
        amount: runAmount(session.run),
        kg: null,
      };
      return;
    }
    if (session.outing !== undefined) {
      find("outing", t(outingName(session.outing))).cells[week] = {
        amount: outingAmount(session.outing),
        kg: null,
      };
      return;
    }
    const seen = new Map<string, number>();
    for (const item of session.items) {
      const id = item.exercise ?? `name:${item.name ?? ""}`;
      const times = seen.get(id) ?? 0;
      seen.set(id, times + 1);
      const key = times === 0 ? id : `${id}#${times}`;
      find(key, exerciseName(item, language)).cells[week] = cellOfItem(item);
    }
  });
  return rows;
}

/** «A · Mon», «Run · Tue», «🚴 · Wed»: as the guide's tabs. */
function tabLabel(sessions: GymPlanSession[], session: GymPlanSession): string {
  const head =
    session.run !== undefined
      ? t("Run")
      : session.outing !== undefined
        ? SPORT_BADGES[sportOfSession(session)]
        : dayLetter(sessions, session.day);
  return `${head} · ${t(WEEK_DAYS[session.day - 1])}`;
}

/**
 * The table of `program` on `today`: the values of each week of the cycle
 * in progress (the first before the plan starts), worked out as «Today»
 * works them out, with the weeks written by hand and the steps of the
 * answers (TASK-488) in.
 */
export function planTable(
  program: GymProgram,
  today: Date,
  language: Language,
): PlanTable {
  const where = cycleWeekOf(program, today);
  const cycle = where?.cycle ?? 0;
  const numbers = Array.from({ length: program.weeks }, (_, i) => i + 1);
  const weeks = numbers.map((week) => sessionsOfWeek(program, week, cycle));
  const byHand = numbers.map((week) => program.custom.some((one) => one.week === week));
  // Every day with a workout in some week, in the week's order.
  const days = [...new Set(weeks.flat().map((one) => one.day))].sort((a, b) => a - b);
  const tabs = days.map((day) => {
    const byWeek = weeks.map((sessions) => sessions.find((one) => one.day === day));
    const first =
      program.sessions.find((one) => one.day === day) ??
      byWeek.find((one) => one !== undefined)!;
    return {
      day,
      label: tabLabel(program.sessions, first),
      rows: rowsOf(byWeek, language),
    };
  });
  return {
    weeks: program.weeks,
    now: where?.week ?? null,
    lighter: numbers.map((week, i) => isLighter(program, week, byHand[i])),
    byHand,
    tabs,
  };
}
