/**
 * A workout at the gym written by hand (TASK-484 part B, ADR-0395): the
 * day between 2020 and today, the start and the length as typed, the rows
 * of the editor as sets none of them live and spread through the workout,
 * a request with `source: "manual"` and nothing of a timer, and the
 * workouts «From a plan» lists.
 */
import type { GymPlan, GymPlanItem } from "@shaperoute/shared-types";

import {
  byHandRequest,
  clockMinutes,
  clockText,
  durationSeconds,
  durationText,
  EARLIEST_DAY,
  endsByNow,
  firstTime,
  nearDay,
  planWorkouts,
  rowsReady,
  setsOfRows,
  shiftDay,
  startEndMs,
} from "./byHand";

// Saturday 21 November 2026, 20:12 on the phone's clock.
const NOW = new Date(2026, 10, 21, 20, 12);
const TODAY = new Date(2026, 10, 21);

const BENCH: GymPlanItem = {
  exercise: "bench_press",
  kind: "load",
  sets: 4,
  reps: 10,
  load_kg: 60,
};
const PLANK: GymPlanItem = {
  exercise: "plank",
  kind: "timed",
  sets: 3,
  duration_s: 45,
};

describe("the day", () => {
  it("goes back a day at a time, never after today nor before 2020", () => {
    expect(shiftDay(TODAY, -1, NOW)).toEqual(new Date(2026, 10, 20));
    expect(shiftDay(TODAY, 1, NOW)).toBeNull();
    expect(shiftDay(new Date(2026, 10, 20), 1, NOW)).toEqual(TODAY);
    expect(shiftDay(EARLIEST_DAY, -1, NOW)).toBeNull();
    expect(shiftDay(new Date(2020, 0, 2), -1, NOW)).toEqual(EARLIEST_DAY);
  });

  it("is today, yesterday, or a date", () => {
    expect(nearDay(TODAY, NOW)).toBe("today");
    expect(nearDay(new Date(2026, 10, 20), NOW)).toBe("yesterday");
    expect(nearDay(new Date(2026, 10, 19), NOW)).toBeNull();
  });

  it("opens on an hour that ended before now", () => {
    const time = firstTime(NOW);
    expect(time).toEqual({ day: TODAY, startMin: 19 * 60 + 5, durationS: 3600 });
    expect(endsByNow(time, NOW.getTime())).toBe(true);
    // Just after midnight: yesterday evening.
    expect(firstTime(new Date(2026, 10, 21, 0, 30))).toEqual({
      day: new Date(2026, 10, 20),
      startMin: 18 * 60,
      durationS: 3600,
    });
  });
});

describe("the start and the length", () => {
  it("reads a time of the day", () => {
    expect(clockMinutes("18:30")).toBe(18 * 60 + 30);
    expect(clockMinutes("8.05")).toBe(8 * 60 + 5);
    expect(clockMinutes("24:00")).toBeNull();
    expect(clockMinutes("18:60")).toBeNull();
    expect(clockMinutes("1830")).toBeNull();
    expect(clockText(8 * 60 + 5)).toBe("08:05");
  });

  it("reads hours and minutes, or minutes alone, from a minute to a day", () => {
    expect(durationSeconds("1:05")).toBe(3900);
    expect(durationSeconds("45")).toBe(2700);
    expect(durationSeconds("0:00")).toBeNull();
    expect(durationSeconds("0")).toBeNull();
    expect(durationSeconds("24:01")).toBeNull();
    expect(durationSeconds("1:75")).toBeNull();
    expect(durationText(3900)).toBe("1:05");
  });

  it("ends after now: not yet", () => {
    const time = { day: TODAY, startMin: 19 * 60 + 30, durationS: 3600 };
    expect(endsByNow(time, NOW.getTime())).toBe(false);
    expect(endsByNow({ ...time, durationS: 42 * 60 }, NOW.getTime())).toBe(true);
    const { startMs, endMs } = startEndMs(time);
    expect(new Date(startMs)).toEqual(new Date(2026, 10, 21, 19, 30));
    expect(endMs - startMs).toBe(3_600_000);
  });
});

describe("the rows", () => {
  it("need a row at least, each with what its kind needs", () => {
    expect(rowsReady([])).toBe(false);
    expect(rowsReady([BENCH, PLANK])).toBe(true);
    expect(
      rowsReady([{ exercise: "bench_press", kind: "load", sets: 4, reps: 10 }]),
    ).toBe(false);
    expect(
      rowsReady([{ exercise: "pull_up", kind: "bodyweight", sets: 3, reps: 8 }]),
    ).toBe(true);
  });

  it("become as many sets as they say, alike, none live, inside the workout", () => {
    const sets = setsOfRows([BENCH, PLANK], 3500);
    expect(sets).not.toBeNull();
    expect(sets).toHaveLength(7);
    expect(sets?.[0]).toEqual({
      exercise: "bench_press",
      kind: "load",
      reps: 10,
      load_kg: 60,
      at_s: 437,
      live: false,
    });
    expect(sets?.[6]).toEqual({
      exercise: "plank",
      kind: "timed",
      duration_s: 45,
      at_s: 3062,
      live: false,
    });
    const times = (sets ?? []).map((set) => set.at_s);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(Math.min(...times)).toBeGreaterThan(0);
    expect(Math.max(...times)).toBeLessThan(3500);
  });

  it("keep the name of an exercise not in the catalog", () => {
    const sets = setsOfRows(
      [{ name: "Sled push", kind: "timed", sets: 1, duration_s: 30 }],
      600,
    );
    expect(sets).toEqual([
      { name: "Sled push", kind: "timed", duration_s: 30, at_s: 300, live: false },
    ]);
  });
});

describe("the request", () => {
  const time = { day: new Date(2026, 10, 20), startMin: 18 * 60 + 30, durationS: 3900 };

  it("is written by hand, with nothing of a timer", () => {
    const request = byHandRequest(time, [BENCH], true, NOW.getTime());
    expect(request).toEqual({
      started_at: new Date(2026, 10, 20, 18, 30).toISOString(),
      ended_at: new Date(2026, 10, 20, 19, 35).toISOString(),
      show_exercises: true,
      sets: setsOfRows([BENCH], 3900),
      source: "manual",
    });
    expect(request).not.toHaveProperty("pauses");
    expect(request).not.toHaveProperty("plan");
  });

  it("keeps «Show exercises» turned off", () => {
    expect(byHandRequest(time, [BENCH], false, NOW.getTime())?.show_exercises).toBe(
      false,
    );
  });

  it("is none without rows, with a row not complete, or ending after now", () => {
    expect(byHandRequest(time, [], true, NOW.getTime())).toBeNull();
    expect(
      byHandRequest(time, [{ ...BENCH, load_kg: undefined }], true, NOW.getTime()),
    ).toBeNull();
    expect(
      byHandRequest(
        { ...time, day: TODAY, startMin: 20 * 60 },
        [BENCH],
        true,
        NOW.getTime(),
      ),
    ).toBeNull();
  });
});

describe("«From a plan»", () => {
  const plain: GymPlan = {
    key: "push",
    name: "Push",
    days: [1, 4],
    items: [BENCH],
    position: 0,
    updated_at: "2026-11-01T10:00:00Z",
  };
  const empty: GymPlan = { ...plain, key: "empty", name: "Empty", items: [] };
  const guided: GymPlan = {
    ...plain,
    key: "guide",
    name: "Strength",
    days: [3, 1],
    items: [],
    program: {
      starts_on: "2026-11-02",
      weeks: 4,
      mode: "load",
      step_kg: 2.5,
      sessions: [
        {
          day: 3,
          name: "Lower",
          items: [{ ...BENCH, exercise: "back_squat", load_kg: 90 }],
        },
        { day: 1, name: "Upper", items: [BENCH] },
        {
          day: 6,
          name: "Long run",
          items: [],
          run: { kind: "long", distance_m: 12000 },
        },
      ],
      custom: [],
    },
  };

  it("lists a plan of one workout as one, and none without exercises", () => {
    expect(planWorkouts([plain, empty], TODAY)).toEqual([
      { key: "push", plan: "Push", day: null, name: "Push", items: [BENCH] },
    ]);
  });

  it("lists each day with exercises of a plan with days, in the week's order", () => {
    const listed = planWorkouts([guided], TODAY);
    expect(listed.map((one) => [one.day, one.name])).toEqual([
      [1, "Upper"],
      [3, "Lower"],
    ]);
    expect(listed.every((one) => one.key === "guide" && one.plan === "Strength")).toBe(
      true,
    );
  });

  it("takes the first week's values before the plan starts", () => {
    const before = planWorkouts([guided], new Date(2026, 9, 1));
    const week1 = planWorkouts([{ ...guided }], new Date(2026, 10, 2));
    expect(before).toEqual(week1);
  });
});
