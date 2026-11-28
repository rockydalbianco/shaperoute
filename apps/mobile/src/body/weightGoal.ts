import { ageIn, type BodyProfile, WEIGHT_KG } from "./bodyProfile";
import { latestOf, type WeighIns, type WeightGoal } from "./weighIns";

/**
 * The goal weight, the milestones and the congratulations (TASK-489 part
 * K1, ADR-0397 precisazione 8; the rule the user approved on 2026-11-24 and
 * 2026-11-27):
 *
 * - the goal and the milestones are the user's own: MuW never proposes one;
 * - only for adults who wrote their height and year of birth. MuW knows the
 *   year of birth only: who turns 18 this year may still be 17, so not them;
 * - never below a body mass index of 18.5, underweight in adults for the
 *   World Health Organization (indicator «Underweight among adults, BMI <
 *   18.5») and the US CDC («Adult BMI Categories»), pages read on
 *   2026-11-27 (`out/TASK-489/FONTI-PARTE-K1.md`);
 * - no congratulation on the weight under that threshold, or under 18;
 * - the steadiness (weigh-ins kept, days of diary) is celebrated for all,
 *   never the speed; the same for losing, gaining or keeping a weight.
 */

/** WHO and CDC: underweight in adults is a body mass index under 18.5. */
export const LOW_BMI = 18.5;
/** Adults only; who turns this age this year counts as younger. */
export const GOAL_FROM_AGE = 18;

/** Congratulations on the weigh-ins kept, and on the days of diary. */
export const WEIGH_IN_COUNTS = [5, 10, 25, 50] as const;
export const DIARY_DAY_COUNTS = [30, 100, 365] as const;

/** Under this, two weights are the same: a tenth of a kilogram. */
const SAME_KG = 0.05;

export type GoalDoor =
  | { kind: "open"; minKg: number }
  /** No height or year of birth: MuW cannot check the threshold. */
  | { kind: "data" }
  | { kind: "under18" };

/** The lowest goal for a height: a body mass index of 18.5, up to the next
 * tenth of a kilogram. */
export function minGoalKg(heightCm: number): number {
  const metres = heightCm / 100;
  return Math.max(WEIGHT_KG.min, Math.ceil(LOW_BMI * metres * metres * 10) / 10);
}

/** Whether `body` may have a goal weight in `year`, and the lowest one. */
export function goalDoor(body: BodyProfile, year: number): GoalDoor {
  const age = ageIn(body, year);
  if (body.heightCm === null || age === null) {
    return { kind: "data" };
  }
  if (age <= GOAL_FROM_AGE) {
    return { kind: "under18" };
  }
  return { kind: "open", minKg: minGoalKg(body.heightCm) };
}

/** Whether a goal of `kg` may be written: not under the threshold, and a
 * weight the body takes. */
export function goalAllowed(door: GoalDoor, kg: number): boolean {
  return door.kind === "open" && kg >= door.minKg && kg <= WEIGHT_KG.max;
}

/** Whether `kg` is a milestone of `goal`: strictly between where it started
 * and the goal. */
export function milestoneAllowed(goal: WeightGoal, kg: number): boolean {
  const low = Math.min(goal.fromKg, goal.kg);
  const high = Math.max(goal.fromKg, goal.kg);
  return kg > low + SAME_KG && kg < high - SAME_KG;
}

/** -1 to lose, 1 to gain, 0 to keep the weight. */
export function directionOf(goal: WeightGoal): -1 | 0 | 1 {
  const change = goal.kg - goal.fromKg;
  return Math.abs(change) < SAME_KG ? 0 : change < 0 ? -1 : 1;
}

/** Whether `latestKg` has reached `kg` on the way of `goal`. */
export function reached(goal: WeightGoal, kg: number, latestKg: number): boolean {
  const direction = directionOf(goal);
  if (direction === 0) {
    return false;
  }
  return direction < 0 ? latestKg <= kg + SAME_KG : latestKg >= kg - SAME_KG;
}

/** How far along the way to the goal: done and total kilograms, done never
 * below 0 nor past the total. Null to keep a weight. */
export function goalProgress(
  goal: WeightGoal,
  latestKg: number,
): { doneKg: number; totalKg: number } | null {
  const totalKg = Math.abs(goal.kg - goal.fromKg);
  if (directionOf(goal) === 0) {
    return null;
  }
  const doneKg = (latestKg - goal.fromKg) * directionOf(goal);
  return { doneKg: Math.min(totalKg, Math.max(0, doneKg)), totalKg };
}

/** Whether congratulations on the weight may show for `body` at `latestKg`:
 * an adult with the data, at or above the threshold. */
export function weightCheersAllowed(
  body: BodyProfile,
  year: number,
  latestKg: number,
): boolean {
  const door = goalDoor(body, year);
  return door.kind === "open" && latestKg >= door.minKg;
}

export type Cheer =
  | { kind: "goal"; key: string; kg: number }
  | { kind: "milestone"; key: string; kg: number }
  | { kind: "weighIns"; key: string; count: number }
  | { kind: "diaryDays"; key: string; count: number };

function kgKey(kg: number): string {
  return (Math.round(kg * 10) / 10).toFixed(1);
}

/**
 * The congratulations due and not shown yet, the most important first: the
 * goal, the milestones the latest weigh-in reached, the weigh-ins kept, the
 * days of diary. `diaryDays` is how many days the diary has.
 */
export function cheersDue(
  weighIns: WeighIns,
  body: BodyProfile,
  year: number,
  diaryDays: number,
): Cheer[] {
  const shown = new Set(weighIns.celebrated);
  const cheers: Cheer[] = [];
  const latest = latestOf(weighIns);
  const { goal } = weighIns;
  if (
    goal !== null &&
    latest !== null &&
    goalAllowed(goalDoor(body, year), goal.kg) &&
    weightCheersAllowed(body, year, latest.kg)
  ) {
    if (reached(goal, goal.kg, latest.kg)) {
      cheers.push({ kind: "goal", key: `goal:${kgKey(goal.kg)}`, kg: goal.kg });
    }
    const steps = weighIns.milestones
      .filter((kg) => milestoneAllowed(goal, kg) && reached(goal, kg, latest.kg))
      // The one furthest along the way first.
      .sort((a, b) => (b - a) * directionOf(goal));
    for (const kg of steps) {
      cheers.push({ kind: "milestone", key: `milestone:${kgKey(kg)}`, kg });
    }
  }
  const counts = WEIGH_IN_COUNTS.filter((count) => weighIns.entries.length >= count);
  const count = counts[counts.length - 1];
  if (count !== undefined) {
    cheers.push({ kind: "weighIns", key: `weighIns:${count}`, count });
  }
  const days = DIARY_DAY_COUNTS.filter((count) => diaryDays >= count);
  const day = days[days.length - 1];
  if (day !== undefined) {
    cheers.push({ kind: "diaryDays", key: `diaryDays:${day}`, count: day });
  }
  return cheers.filter((cheer) => !shown.has(cheer.key));
}

/** The weigh-ins with `cheer` marked as shown, and with every smaller one
 * of its kind too: reaching 25 does not bring back 5 and 10 later. */
export function withCheered(weighIns: WeighIns, cheer: Cheer): WeighIns {
  const keys = new Set(weighIns.celebrated);
  keys.add(cheer.key);
  if (cheer.kind === "weighIns") {
    for (const count of WEIGH_IN_COUNTS) {
      if (count <= cheer.count) {
        keys.add(`weighIns:${count}`);
      }
    }
  }
  if (cheer.kind === "diaryDays") {
    for (const count of DIARY_DAY_COUNTS) {
      if (count <= cheer.count) {
        keys.add(`diaryDays:${count}`);
      }
    }
  }
  return { ...weighIns, celebrated: [...keys] };
}

/** A new goal from `fromKg`: the milestones of the old one go, and so do
 * the congratulations on a goal or milestone. */
export function withGoal(
  weighIns: WeighIns,
  kg: number | null,
  fromKg: number,
): WeighIns {
  return {
    ...weighIns,
    goal: kg === null ? null : { kg, fromKg },
    milestones: [],
    celebrated: weighIns.celebrated.filter(
      (key) => !key.startsWith("goal:") && !key.startsWith("milestone:"),
    ),
  };
}

export function withMilestone(weighIns: WeighIns, kg: number): WeighIns {
  const { goal } = weighIns;
  if (goal === null || !milestoneAllowed(goal, kg)) {
    return weighIns;
  }
  return {
    ...weighIns,
    milestones: [
      ...weighIns.milestones.filter((step) => Math.abs(step - kg) >= SAME_KG),
      kg,
    ],
  };
}

export function withoutMilestone(weighIns: WeighIns, kg: number): WeighIns {
  return {
    ...weighIns,
    milestones: weighIns.milestones.filter((step) => Math.abs(step - kg) >= SAME_KG),
  };
}
