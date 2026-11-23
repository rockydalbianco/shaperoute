import type {
  GymPlan,
  GymPlanItem,
  GymPlanRequest,
  GymPlanSession,
} from "@shaperoute/shared-types";

import type { TipChange } from "./rules";

/**
 * «Apply» (TASK-491 part A, ADR-0399, the user's «Solo con Apply» of
 * 2026-11-22): a tip's change made on its plan, saved afterwards with the
 * PUT /me/gym-plans/{key} the app already has. The amounts are added to
 * the exercise in every week of the plan: the first week of a program and
 * the weeks written by hand, so the weeks worked out from it move too.
 */

/** The sets a plan's exercise may have (gym_plans.py). */
export const MIN_SETS = 1;
export const MAX_SETS = 20;

function round(kg: number): number {
  return Math.round(kg * 100) / 100;
}

function changed(item: GymPlanItem, change: TipChange): GymPlanItem {
  if (item.exercise !== change.exercise) {
    return item;
  }
  return {
    ...item,
    ...(change.deltaSets === undefined
      ? {}
      : { sets: Math.min(MAX_SETS, Math.max(MIN_SETS, item.sets + change.deltaSets)) }),
    ...(change.deltaReps === undefined || item.reps === undefined
      ? {}
      : { reps: Math.max(1, item.reps + change.deltaReps) }),
    ...(change.deltaKg === undefined || item.load_kg === undefined
      ? {}
      : { load_kg: Math.max(0, round(item.load_kg + change.deltaKg)) }),
  };
}

function inSessions(sessions: GymPlanSession[], change: TipChange): GymPlanSession[] {
  return sessions.map((session) => ({
    ...session,
    items: session.items.map((item) => changed(item, change)),
  }));
}

function hasExercise(plan: GymPlan, exercise: string): boolean {
  const items = [
    ...plan.items,
    ...(plan.program?.sessions.flatMap((one) => one.items) ?? []),
    ...(plan.program?.custom.flatMap((week) =>
      week.sessions.flatMap((one) => one.items),
    ) ?? []),
  ];
  return items.some((item) => item.exercise === exercise);
}

/** The plan with the change made, to save; null when the plan is not the
 * tip's or no longer has its exercise. */
export function applyTip(
  plan: GymPlan,
  change: TipChange,
  now: Date = new Date(),
): GymPlanRequest | null {
  if (plan.key !== change.plan || !hasExercise(plan, change.exercise)) {
    return null;
  }
  const { key: _key, ...request } = plan;
  return {
    ...request,
    items: plan.items.map((item) => changed(item, change)),
    updated_at: now.toISOString(),
    ...(plan.program == null
      ? {}
      : {
          program: {
            ...plan.program,
            sessions: inSessions(plan.program.sessions, change),
            custom: plan.program.custom.map((week) => ({
              ...week,
              sessions: inSessions(week.sessions, change),
            })),
          },
        }),
  };
}
