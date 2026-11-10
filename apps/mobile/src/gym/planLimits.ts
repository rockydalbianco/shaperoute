import { tLater } from "../i18n";

/**
 * What the plans of the gym share (TASK-411 C, ADR-0341). The plan's own
 * editor of part C gave way to the guide (GymPlanWizard.tsx, 2026-11-10):
 * a plan, with weeks or without, is changed there.
 */

/** The days of the week from Monday, 1 to 7 as the API counts them. */
export const WEEK_DAYS = [
  tLater("Mon"),
  tLater("Tue"),
  tLater("Wed"),
  tLater("Thu"),
  tLater("Fri"),
  tLater("Sat"),
  tLater("Sun"),
];

/** At most this many exercises a workout and sets an exercise
 * (gym_plans.py). */
export const MAX_ITEMS = 30;
export const MAX_SETS = 20;
