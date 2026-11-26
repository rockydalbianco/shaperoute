import type {
  GymCalendar,
  GymCalendarWorkout,
  GymPlan,
  GymProgram,
  GymSession,
} from "@shaperoute/shared-types";

import type { Activity, ActivitiesPage } from "../api/activities";
import {
  atMost,
  buildCoachInput,
  type CoachFetchers,
  type CoachRaw,
  fetchCoachRaw,
  MAX_AT_ONCE,
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

/** Lets a test hold every answer and give them back in the order it likes. */
function held() {
  let inFlight = 0;
  let most = 0;
  const waiting: { what: string; go: () => void }[] = [];
  function later<T>(what: string, value: T): Promise<T> {
    inFlight += 1;
    most = Math.max(most, inFlight);
    return new Promise<T>((resolve) => {
      waiting.push({
        what,
        go: () => {
          inFlight -= 1;
          resolve(value);
        },
      });
    });
  }
  /** Answers the newest waiting request first, until none waits. */
  async function newestFirst(): Promise<string[]> {
    const order: string[] = [];
    for (let round = 0; round < 200; round += 1) {
      await new Promise((tick) => setTimeout(tick, 0));
      const last = waiting.pop();
      if (last === undefined) {
        break;
      }
      order.push(last.what);
      last.go();
    }
    return order;
  }
  return { later, newestFirst, most: () => most, inFlight: () => inFlight };
}

describe("fetchCoachRaw, a few at once (TASK-501)", () => {
  const many = Array.from({ length: 25 }, (_, i) => workout(`w${i}`, i % 27));
  const months = monthsBack(NOW);

  function slowFetchers(answers: ReturnType<typeof held>): CoachFetchers {
    const quick = fetchers({
      calendar: async (month) => ({
        kind: "ok",
        value: calendarOf(month === months[months.length - 1] ? many : []),
      }),
    });
    return {
      calendar: async (month) =>
        answers.later(`calendar ${month}`, await quick.calendar(month)),
      session: async (key) => answers.later(`session ${key}`, await quick.session(key)),
      plans: async () => answers.later("plans", await quick.plans()),
      activities: async (cursor) =>
        answers.later(
          `activities ${cursor ?? "first"}`,
          await quick.activities(cursor),
        ),
    };
  }

  it("asks at most four at once and gets what one after the other got", async () => {
    // One after the other, as before: every answer at once.
    const before = await fetchCoachRaw(
      fetchers({
        calendar: async (month) => ({
          kind: "ok",
          value: calendarOf(month === months[months.length - 1] ? many : []),
        }),
      }),
      NOW,
      70,
    );
    const answers = held();
    const asking = fetchCoachRaw(slowFetchers(answers), NOW, 70);
    const order = await answers.newestFirst();
    const after = await asking;

    expect(answers.most()).toBe(MAX_AT_ONCE);
    expect(answers.inFlight()).toBe(0);
    // The answers came back in another order than they were asked...
    expect(order.filter((one) => one.startsWith("session"))).not.toEqual(
      [...order.filter((one) => one.startsWith("session"))].sort(),
    );
    // ...and the lists are those of one request after the other.
    expect(after).toEqual(before);
    expect(after.kind === "ok" && after.raw.sessions.map((one) => one.id)).toEqual(
      before.kind === "ok" && before.raw.sessions.map((one) => one.id),
    );
    expect(after.kind === "ok" && after.raw.sessions).toHaveLength(MAX_SESSIONS);
  });

  it("asks each page of runs from where the one before ended", async () => {
    const asked: string[] = [];
    let open = 0;
    const f = fetchers({
      activities: async (cursor) => {
        open += 1;
        expect(open).toBe(1);
        asked.push(cursor ?? "first");
        await new Promise((tick) => setTimeout(tick, 0));
        open -= 1;
        return {
          kind: "ok",
          value: {
            activities: [activity(`r${asked.length}`, asked.length, 5, "running")],
            next: `c${asked.length + 1}`,
            total: 9,
          },
        };
      },
    });
    const outcome = await fetchCoachRaw(f, NOW);
    expect(asked).toEqual(["first", "c2", "c3", "c4", "c5"]);
    expect(
      outcome.kind === "ok" && outcome.raw.activities.map((one) => one.id),
    ).toEqual(["r1", "r2", "r3", "r4", "r5"]);
  });
});

describe("atMost", () => {
  it("never runs more than its cap, and runs everything in the order it came", async () => {
    const ask = atMost(2);
    let running = 0;
    let most = 0;
    const started: number[] = [];
    const jobs = Array.from({ length: 7 }, (_, i) =>
      ask(async () => {
        running += 1;
        most = Math.max(most, running);
        started.push(i);
        await new Promise((tick) => setTimeout(tick, (7 - i) % 3));
        running -= 1;
        return i * 10;
      }),
    );
    // One that comes while the others wait does not get in front of them.
    const late = ask(async () => {
      started.push(99);
      return -1;
    });
    expect(await Promise.all(jobs)).toEqual([0, 10, 20, 30, 40, 50, 60]);
    expect(await late).toBe(-1);
    expect(most).toBe(2);
    expect(started).toEqual([0, 1, 2, 3, 4, 5, 6, 99]);
  });

  it("frees the place of one that throws", async () => {
    const ask = atMost(1);
    await expect(ask(async () => Promise.reject(new Error("no")))).rejects.toThrow(
      "no",
    );
    expect(await ask(async () => "next")).toBe("next");
  });
});
