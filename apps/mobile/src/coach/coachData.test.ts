import type {
  GymCalendar,
  GymCalendarWorkout,
  GymPlan,
  GymProgram,
  GymSession,
} from "@shaperoute/shared-types";

import type { Activity, ActivitiesPage } from "../api/activities";
import {
  buildCoachInput,
  type CoachFetchers,
  type CoachRaw,
  fetchCoachRaw,
  MAX_SESSIONS,
  monthsBack,
  planItemsOf,
  targetOf,
  todayOf,
} from "./coachData";

const NOW = new Date(2026, 10, 23, 12, 0, 0); // a Monday
const DAY = 86_400_000;

function at(days: number): string {
  return new Date(NOW.getTime() - days * DAY).toISOString();
}

function workout(id: string, days: number, durationS = 3600): GymCalendarWorkout {
  return { id, started_at: at(days), duration_s: durationS, drawing_id: null };
}

function session(id: string, days: number, plan?: string): GymSession {
  return {
    id,
    started_at: at(days),
    duration_s: 3600,
    rests: 0,
    rest_s: 0,
    show_exercises: true,
    ...(plan === undefined ? {} : { plan }),
    sets: [
      {
        exercise: "bench_press",
        kind: "load",
        reps: 10,
        load_kg: 60,
        at_s: 10,
        live: true,
      },
      {
        exercise: "bench_press",
        kind: "load",
        reps: 9,
        load_kg: 60,
        at_s: 200,
        live: true,
      },
      { exercise: "plank", kind: "timed", duration_s: 60, at_s: 400, live: true },
      { name: "My move", kind: "load", reps: 10, load_kg: 10, at_s: 500, live: true },
    ],
  };
}

function plan(key: string, more: Partial<GymPlan> = {}): GymPlan {
  return {
    key,
    name: key,
    days: [1, 4],
    items: [{ exercise: "bench_press", kind: "load", sets: 3, reps: 10, load_kg: 60 }],
    position: 0,
    updated_at: at(30),
    ...more,
  };
}

const PROGRAM: GymProgram = {
  starts_on: "2026-11-16",
  weeks: 4,
  mode: "load",
  step_kg: 2.5,
  sessions: [
    {
      day: 1,
      name: "A",
      items: [{ exercise: "bench_press", kind: "load", sets: 3, reps: 8, load_kg: 50 }],
    },
    { day: 3, name: "Run", items: [], run: { kind: "easy", distance_m: 5000 } },
  ],
  custom: [],
  runner: { pace_10k_s: 330 },
};

function activity(
  id: string,
  days: number,
  km: number,
  kind?: Activity["activity"],
): Activity {
  return {
    id,
    started_at: at(days),
    place: null,
    shape: null,
    word: null,
    style: null,
    title: null,
    distance_m: km * 1000,
    duration_s: km * 360,
    score: null,
    fidelity: null,
    ...(kind === undefined ? {} : { activity: kind }),
    route_preview: null,
    track_preview: [],
  } as Activity;
}

function raw(more: Partial<CoachRaw> = {}): CoachRaw {
  return { now: NOW, calendar: [], sessions: [], plans: [], activities: [], ...more };
}

describe("targetOf", () => {
  it("reads a simple plan's item", () => {
    expect(targetOf(plan("p"), "bench_press", NOW)?.load_kg).toBe(60);
  });

  it("reads the week's values of a program", () => {
    const programmed = plan("p", { program: PROGRAM });
    expect(targetOf(programmed, "bench_press", NOW)?.load_kg).toBe(52.5);
    expect(targetOf(programmed, "squat", NOW)).toBeUndefined();
    expect(targetOf(undefined, "bench_press", NOW)).toBeUndefined();
  });
});

describe("buildCoachInput", () => {
  it("groups the sets of a catalog exercise with the plan's target", () => {
    const input = buildCoachInput(
      raw({
        calendar: [workout("w1", 2)],
        sessions: [session("w1", 2, "p")],
        plans: [plan("p")],
      }),
    );
    expect(input.workouts).toHaveLength(1);
    expect(input.workouts[0].plan).toBe("p");
    expect(input.workouts[0].exercises).toEqual([
      {
        exercise: "bench_press",
        targetReps: 10,
        targetKg: 60,
        sets: [
          { kind: "load", reps: 10, load_kg: 60 },
          { kind: "load", reps: 9, load_kg: 60 },
        ],
      },
    ]);
  });

  it("keeps an older workout for the load, without its sets", () => {
    const input = buildCoachInput(
      raw({ calendar: [workout("w1", 40, 1800), workout("w0", 70)] }),
    );
    expect(input.workouts).toEqual([
      { id: "w1", startedAt: new Date(at(40)), durationS: 1800, exercises: [] },
    ]);
  });

  it("keeps only runs of the last 8 weeks", () => {
    const input = buildCoachInput(
      raw({
        activities: [
          activity("a", 3, 5, "running"),
          activity("b", 4, 5),
          activity("c", 5, 20, "cycling"),
          activity("d", 60, 5, "running"),
        ],
      }),
    );
    expect(input.runs.map((one) => one.distanceM)).toEqual([5000, 5000]);
  });

  it("takes the 10 km pace, today's workout and the sleep score", () => {
    const input = buildCoachInput(
      raw({ plans: [plan("p", { program: PROGRAM })], sleepScore: 55 }),
    );
    expect(input.pace10kS).toBe(330);
    expect(input.today?.day).toBe(1);
    expect(input.sleepScore).toBe(55);
  });
});

describe("plans", () => {
  it("lists every exercise with its day", () => {
    expect(planItemsOf([plan("p")]).map((one) => one.day)).toEqual([1, 4]);
    expect(
      planItemsOf([plan("q", { program: PROGRAM })]).map((one) => one.day),
    ).toEqual([1]);
  });

  it("finds today's workout, none on a run day", () => {
    expect(todayOf([plan("p")], NOW)?.plan).toBe("p");
    expect(todayOf([plan("p", { days: [2] })], NOW)).toBeUndefined();
    const wednesday = new Date(NOW.getTime() + 2 * DAY);
    expect(todayOf([plan("q", { program: PROGRAM })], wednesday)).toBeUndefined();
  });
});

describe("monthsBack", () => {
  it("covers 8 weeks", () => {
    expect(monthsBack(NOW)).toEqual(["2026-09", "2026-10", "2026-11"]);
    expect(monthsBack(new Date(2026, 2, 31))).toEqual(["2026-02", "2026-03"]);
  });
});

function calendarOf(workouts: GymCalendarWorkout[]): GymCalendar {
  return {
    month: "2026-11",
    tz: "UTC",
    count: workouts.length,
    duration_s: 0,
    days: workouts.map((one, index) => ({ day: index + 1, workouts: [one] })),
    last: null,
  };
}

function fetchers(
  more: Partial<CoachFetchers> = {},
): CoachFetchers & { asked: string[] } {
  const asked: string[] = [];
  return {
    asked,
    calendar: async (month) => {
      asked.push(`calendar ${month}`);
      return month === "2026-11"
        ? { kind: "ok", value: calendarOf([workout("w1", 2), workout("w2", 40)]) }
        : { kind: "ok", value: calendarOf([]) };
    },
    session: async (key) => {
      asked.push(`session ${key}`);
      return { kind: "ok", value: session(key, 2) };
    },
    plans: async () => ({ kind: "ok", value: { plans: [plan("p")] } }),
    activities: async (cursor) => {
      asked.push(`activities ${cursor ?? "first"}`);
      const page: ActivitiesPage =
        cursor === null
          ? { activities: [activity("a", 3, 5, "running")], next: "c2", total: 2 }
          : { activities: [activity("b", 70, 5, "running")], next: "c3", total: 3 };
      return { kind: "ok", value: page };
    },
    ...more,
  };
}

describe("fetchCoachRaw", () => {
  it("reads the months, the recent workouts whole, the plans and the runs", async () => {
    const f = fetchers();
    const outcome = await fetchCoachRaw(f, NOW, 70);
    expect(outcome.kind).toBe("ok");
    if (outcome.kind !== "ok") {
      return;
    }
    expect(outcome.raw.calendar.map((one) => one.id)).toEqual(["w1", "w2"]);
    expect(outcome.raw.sessions.map((one) => one.id)).toEqual(["w1"]);
    expect(outcome.raw.activities.map((one) => one.id)).toEqual(["a", "b"]);
    expect(outcome.raw.sleepScore).toBe(70);
    expect(f.asked).not.toContain("activities c3");
  });

  it("reads at most 20 workouts whole", async () => {
    const many = Array.from({ length: 25 }, (_, i) => workout(`w${i}`, i % 27));
    const f = fetchers({
      calendar: async () => ({ kind: "ok", value: calendarOf(many) }),
    });
    const outcome = await fetchCoachRaw(f, NOW);
    expect(f.asked.filter((one) => one.startsWith("session"))).toHaveLength(
      MAX_SESSIONS,
    );
    expect(outcome.kind).toBe("ok");
  });

  it("leaves out what fails, and is unreachable when nothing answers", async () => {
    const down = { kind: "unreachable" as const, url: "x" };
    const partly = await fetchCoachRaw(fetchers({ session: async () => down }), NOW);
    expect(partly.kind === "ok" && partly.raw.sessions).toEqual([]);
    const none = await fetchCoachRaw(
      {
        calendar: async () => down,
        session: async () => down,
        plans: async () => down,
        activities: async () => down,
      },
      NOW,
    );
    expect(none).toEqual({ kind: "unreachable" });
  });
});
