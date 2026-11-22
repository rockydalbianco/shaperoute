import type {
  GymPlan,
  GymPlanPosted,
  GymPlanPostedProgram,
  GymProgram,
} from "@shaperoute/shared-types";

import { isoDate } from "./program";

/**
 * A gym plan and its copy in a post (TASK-485, ADR-0394, the user's choices
 * of 2026-11-21): the post carries the plan as it was at «Post», with its
 * name, days, exercises with their kg and weeks; never what is its owner's
 * own, the first day, the paces (`runner`) and the day of the target, which
 * the API refuses. «Use this plan» makes a new plan of the copy, kg
 * included, starting on a day of whoever copies it, without paces (the
 * guide asks «How do you run today?» when it has runs) and with its target
 * «when I'm ready».
 */

/** At most this many characters a plan's name (gym_plans.py). */
const MAX_NAME = 40;

/** The copy a post carries of `plan`: what is its owner's left out. */
export function postedPlan(
  plan: Pick<GymPlan, "name" | "days" | "items" | "program">,
): GymPlanPosted {
  const posted: GymPlanPosted = {
    name: plan.name.trim().slice(0, MAX_NAME),
    days: [...plan.days],
    items: plan.items.map((item) => ({ ...item })),
  };
  if (plan.program != null) {
    posted.program = postedProgram(plan.program);
  }
  return posted;
}

function postedProgram(program: GymProgram): GymPlanPostedProgram {
  const copy: Partial<GymProgram> = structuredCopy(program);
  // The first day and the paces are its owner's: never in the copy.
  delete copy.starts_on;
  delete copy.runner;
  // The target stays, its day does not: whoever copies starts when ready.
  if (copy.target !== undefined) {
    delete copy.target.on;
  }
  return copy as GymPlanPostedProgram;
}

/** A deep copy of plain data: a post and a plan share nothing. */
function structuredCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Today when it is a Monday, the next Monday otherwise: the first day the
 * guide offers a new plan. */
export function firstDay(today: Date): string {
  const offset = (8 - today.getDay()) % 7;
  return isoDate(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset),
  );
}

/**
 * The plan «Use this plan» opens in the guide's last step: a new one (no
 * key yet), the copy whole with its kg, the first day the guide offers,
 * no paces, no target day. The guide saves it as any new plan
 * (`PUT /me/gym-plans/{key}`, at most 20).
 */
export function planFromPosted(
  posted: GymPlanPosted,
  today: Date = new Date(),
): GymPlan {
  const program: GymProgram | null =
    posted.program === undefined
      ? null
      : { ...structuredCopy(posted.program), starts_on: firstDay(today) };
  return {
    key: "",
    name: posted.name.slice(0, MAX_NAME),
    days: [...posted.days],
    items: structuredCopy(posted.items),
    position: 0,
    updated_at: today.toISOString(),
    program,
  };
}
