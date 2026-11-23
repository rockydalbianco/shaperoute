/**
 * The plans of the gym on the phone and the workout that follows one
 * (TASK-411 C, ADR-0341 points 3–5): kept without a network, the API's
 * list merged with what waits here, «Today» the first plan of the day, and
 * a workout that begins with the plan's first exercise, counts its sets,
 * moves on by itself and says which plan it followed.
 */
import plans from "@shaperoute/shared-types/fixtures/gym-plans.json";
import type { GymPlan } from "@shaperoute/shared-types";

import {
  dropPlan,
  forgetPlans,
  isoDay,
  keepPlan,
  mergePlans,
  plansOf,
  todayPlan,
  workoutPlan,
} from "./plans";
import {
  logSet,
  newWorkout,
  nextPlanItem,
  planProgress,
  planTarget,
  sessionRequest,
  finishWorkout,
} from "./workout";

jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const [PUSH, LEGS] = plans.plans as GymPlan[];
const OWNER = 7;
const T0 = Date.UTC(2026, 10, 9, 17);

beforeEach(() => {
  files.clear();
  forgetPlans();
});

test("«Today» is the first plan, in order, of today's day of the week", () => {
  // Monday 9 November 2026.
  const monday = new Date(2026, 10, 9, 9);
  expect(isoDay(monday)).toBe(1);
  expect(isoDay(new Date(2026, 10, 15, 9))).toBe(7);
  expect(todayPlan([PUSH, LEGS], monday)?.name).toBe("Push");
  expect(todayPlan([PUSH, LEGS], new Date(2026, 10, 11, 9))?.name).toBe("Legs");
  expect(todayPlan([PUSH, LEGS], new Date(2026, 10, 10, 9))).toBeNull();
  // Two plans the same day: the first in order.
  const early = { ...LEGS, days: [1], position: 0, key: "aa00000000000000" };
  expect(todayPlan([early, PUSH], monday)?.name).toBe("Legs");
});

test("a plan kept here waits; the API's list merges with it, newest first", () => {
  const kept = keepPlan(OWNER, null, { name: "Pull", days: [2], items: [] }, T0);
  expect(kept.state).toBe("waiting");
  expect(plansOf(OWNER).map((plan) => plan.name)).toEqual(["Pull"]);
  // Another account's plans are not these.
  expect(plansOf(OWNER + 1)).toEqual([]);

  // The API has Push and Legs, not Pull yet: Pull stays, waiting. Pull was
  // the first here, at position 0 as Push: the key orders them.
  mergePlans(OWNER, [PUSH, LEGS]);
  expect(plansOf(OWNER).map((plan) => [plan.name, plan.state])).toEqual([
    ["Pull", "waiting"],
    ["Push", "sent"],
    ["Legs", "sent"],
  ]);

  // Changed here after the API's version: this one stays.
  keepPlan(OWNER, PUSH.key, { name: "Push A", days: [1], items: PUSH.items }, T0);
  mergePlans(OWNER, [PUSH, LEGS]);
  expect(plansOf(OWNER).find((plan) => plan.key === PUSH.key)?.name).toBe("Push A");

  // Dropped here: gone from the list, waiting to tell the API.
  dropPlan(OWNER, LEGS.key);
  expect(plansOf(OWNER).map((plan) => plan.name)).not.toContain("Legs");

  // Kept in the file: read again, the same.
  forgetPlans();
  expect(
    plansOf(OWNER)
      .map((plan) => plan.name)
      .sort(),
  ).toEqual(["Pull", "Push A"]);
});

test("a plan the API no longer has, not changed here, is gone", () => {
  mergePlans(OWNER, [PUSH, LEGS]);
  mergePlans(OWNER, [LEGS]);
  expect(plansOf(OWNER).map((plan) => plan.name)).toEqual(["Legs"]);
});

test("a workout follows its plan: first exercise, values aimed at, sets counted", () => {
  const plan = workoutPlan(PUSH);
  let workout = newWorkout("w1", T0, plan);
  expect(workout.current).toEqual({ exercise: "bench_press", kind: "load" });
  expect(planTarget(workout, workout.current!)).toEqual({ reps: 8, load_kg: 60 });
  expect(planProgress(workout)).toEqual({ done: 0, total: 9 });

  // Four sets of the bench press, then the plan moves on to the dips.
  for (let i = 0; i < 4; i += 1) {
    const next = logSet(workout, { reps: 8, load_kg: 60 }, T0 + (i + 1) * 120_000);
    expect(next).not.toBeNull();
    workout = next!;
  }
  expect(planProgress(workout)).toEqual({ done: 4, total: 9 });
  expect(workout.current).toEqual({ exercise: "dips", kind: "bodyweight" });
  expect(nextPlanItem(workout)?.exercise).toBe("dips");

  // A set of something else counts for no item.
  const other = logSet(
    { ...workout, current: { exercise: "crunch", kind: "bodyweight" } },
    { reps: 20 },
    T0 + 900_000,
  )!;
  expect(planProgress(other)).toEqual({ done: 4, total: 9 });

  const ended = finishWorkout(workout, T0 + 3_600_000);
  expect(sessionRequest(ended)?.plan).toBe(PUSH.key);
  // A free workout says no plan.
  const free = finishWorkout(newWorkout("w2", T0), T0 + 60_000);
  expect(sessionRequest(free)).not.toHaveProperty("plan");
  expect(planProgress(free)).toBeNull();
});
