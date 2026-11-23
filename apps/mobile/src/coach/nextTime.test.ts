import type { GymPlan, GymSession } from "@shaperoute/shared-types";

import type { Workout } from "../gym/workout";
import type { CoachRaw } from "./coachData";
import { nextTimeText, nextTimeTip } from "./nextTime";

const DAY = 86_400_000;
const NOW = new Date("2026-11-20T18:00:00Z");

function at(days: number): string {
  return new Date(NOW.getTime() - days * DAY).toISOString();
}

const PLAN: GymPlan = {
  key: "p",
  name: "Push",
  days: [1, 2, 3, 4, 5, 6, 7],
  items: [
    { exercise: "bench_press", kind: "load", sets: 3, reps: 10, load_kg: 60 },
    { exercise: "back_squat", kind: "load", sets: 3, reps: 10, load_kg: 80 },
  ],
  position: 0,
  updated_at: at(30),
};

function sets(exercise: string, reps: number, kg: number) {
  return [0, 1, 2].map((n) => ({
    exercise,
    kind: "load" as const,
    reps,
    load_kg: kg,
    at_s: n * 120,
    live: true,
  }));
}

function session(
  id: string,
  days: number,
  exercise: string,
  reps = 10,
  kg = 60,
): GymSession {
  return {
    id,
    started_at: at(days),
    duration_s: 3600,
    rests: 0,
    rest_s: 0,
    show_exercises: true,
    plan: "p",
    sets: sets(exercise, reps, kg),
  };
}

function raw(sessions: GymSession[]): CoachRaw {
  return {
    now: NOW,
    calendar: sessions.map((one) => ({
      id: one.id,
      started_at: one.started_at,
      duration_s: one.duration_s,
      drawing_id: null,
    })),
    sessions,
    plans: [PLAN],
    activities: [],
  };
}

/** A workout of the plan ended an hour after it began, an hour ago. */
function workout(exercise: string, reps = 10, kg = 60, key = "now"): Workout {
  const startedMs = NOW.getTime() - 2 * 3_600_000;
  return {
    key,
    startedMs,
    pauses: [],
    current: null,
    sets: sets(exercise, reps, kg).map((set, index) => ({ ...set, n: index + 1 })),
    rest: null,
    rests: 2,
    restS: 240,
    restChoices: {},
    lastActiveMs: startedMs + 3_600_000,
    endedMs: startedMs + 3_600_000,
    nextN: 4,
    plan: { key: "p", name: "Push", items: PLAN.items },
  };
}

test("all the reps twice in a row, this workout the second: add weight next time", () => {
  const tip = nextTimeTip(
    raw([session("a", 3, "bench_press")]),
    workout("bench_press"),
  );
  expect(tip).toMatchObject({
    rule: "P1",
    exercise: "bench_press",
    values: { kg: 62.5, old: 60 },
  });
  expect(nextTimeText(tip!, "en")).toBe("Next time: Bench press 62.5 kg");
});

test("legs go up by 5 kg, and a whole number has no decimals", () => {
  const tip = nextTimeTip(
    raw([session("a", 3, "back_squat", 10, 80)]),
    workout("back_squat", 10, 80),
  );
  expect(nextTimeText(tip!, "en")).toBe("Next time: Squat 85 kg");
});

test("reps missed in this workout: no line", () => {
  expect(
    nextTimeTip(raw([session("a", 3, "bench_press")]), workout("bench_press", 9)),
  ).toBeNull();
});

test("the first time at this weight: no line", () => {
  expect(nextTimeTip(raw([]), workout("bench_press"))).toBeNull();
  expect(
    nextTimeTip(raw([session("a", 3, "bench_press", 10, 55)]), workout("bench_press")),
  ).toBeNull();
});

test("a weight to add for another exercise is not this workout's line", () => {
  const before = [
    session("a", 6, "back_squat", 10, 80),
    session("b", 3, "back_squat", 10, 80),
  ];
  expect(nextTimeTip(raw(before), workout("bench_press"))).toBeNull();
});

test("the workout already on the API counts once", () => {
  const saved = { ...session("now", 0.08, "bench_press") };
  expect(nextTimeTip(raw([saved]), workout("bench_press"))).toBeNull();
});

test("a workout not ended yet has no line", () => {
  expect(
    nextTimeTip(raw([session("a", 3, "bench_press")]), {
      ...workout("bench_press"),
      endedMs: null,
    }),
  ).toBeNull();
});
