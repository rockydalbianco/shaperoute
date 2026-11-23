import type { GymCalendar } from "@shaperoute/shared-types";

import { MUSCLES } from "../gym/muscles";
import {
  bodyShare,
  FULL_SETS,
  inWeek,
  levelOf,
  monthsOfWeek,
  musclesAt,
  noSets,
  percentOf,
  plus,
  setsByMuscle,
  weekStart,
  weekWorkouts,
} from "./weekBody";

// The body of the week (TASK-490 part B): sets by muscle, the four looks,
// the share of the body trained and the week from Monday.

describe("sets by muscle", () => {
  it("counts 1 for the muscles of an exercise and ½ for those that help", () => {
    // Bench press: chest, helped by shoulders and triceps.
    const count = setsByMuscle([
      { exercise: "bench_press" },
      { exercise: "bench_press" },
    ]);
    expect(count.chest).toBe(2);
    expect(count.shoulders).toBe(1);
    expect(count.triceps).toBe(1);
    expect(count.quads).toBe(0);
  });

  it("leaves out an exercise the user named", () => {
    expect(setsByMuscle([{}, { exercise: "not_in_the_catalog" }])).toEqual(noSets());
  });

  it("adds two counts", () => {
    const a = setsByMuscle([{ exercise: "bench_press" }]);
    expect(plus(a, a).chest).toBe(2);
    expect(plus(a, noSets())).toEqual(a);
  });
});

describe("the looks and the share", () => {
  it("is untouched at 0, then 1–4, 5–9, 10 or more", () => {
    expect([0, 0.5, 4.5, 5, 9.5, 10, 25].map(levelOf)).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });

  it("is the mean over the muscles of min(sets / 10, 1)", () => {
    const count = noSets();
    expect(bodyShare(count)).toBe(0);
    count.chest = 20;
    count.quads = 5;
    expect(bodyShare(count)).toBeCloseTo((1 + 0.5) / MUSCLES.length);
    for (const muscle of MUSCLES) {
      count[muscle] = FULL_SETS;
    }
    expect(percentOf(bodyShare(count))).toBe(100);
  });

  it("lists the muscles at each look", () => {
    const count = noSets();
    count.chest = 12;
    count.biceps = 3;
    expect(musclesAt(count, 3)).toEqual(["chest"]);
    expect(musclesAt(count, 1)).toEqual(["biceps"]);
    expect(musclesAt(count, 0)).toHaveLength(MUSCLES.length - 2);
  });
});

describe("the week", () => {
  it("starts on Monday at midnight", () => {
    // Sunday 22 and Monday 23 November 2026.
    expect(weekStart(new Date(2026, 10, 22, 20)).getDate()).toBe(16);
    expect(weekStart(new Date(2026, 10, 23, 9))).toEqual(new Date(2026, 10, 23));
  });

  it("holds what began since Monday and not later than now", () => {
    const now = new Date(2026, 10, 25, 12);
    expect(inWeek(new Date(2026, 10, 23, 7).toISOString(), now)).toBe(true);
    expect(inWeek(new Date(2026, 10, 22, 23).toISOString(), now)).toBe(false);
    expect(inWeek(new Date(2026, 10, 26, 7).toISOString(), now)).toBe(false);
  });

  it("asks one month, or two when the week began in the one before", () => {
    expect(monthsOfWeek(new Date(2026, 10, 25))).toEqual(["2026-11"]);
    // Tuesday 1 December 2026: the week began on Monday 30 November.
    expect(monthsOfWeek(new Date(2026, 11, 1))).toEqual(["2026-11", "2026-12"]);
  });

  it("takes the workouts of the week from the calendars, each once", () => {
    const now = new Date(2026, 10, 25, 12);
    const at = (day: number) => new Date(2026, 10, day, 18).toISOString();
    const calendar = {
      month: "2026-11",
      tz: "Europe/Rome",
      count: 3,
      duration_s: 0,
      days: [
        {
          day: 20,
          workouts: [
            { id: "old", started_at: at(20), duration_s: 1, drawing_id: null },
          ],
        },
        {
          day: 23,
          workouts: [
            { id: "mon", started_at: at(23), duration_s: 1, drawing_id: null },
          ],
        },
        {
          day: 24,
          workouts: [
            { id: "tue", started_at: at(24), duration_s: 1, drawing_id: null },
          ],
        },
      ],
      last: null,
    } satisfies GymCalendar;
    expect(weekWorkouts([calendar, calendar], now)).toEqual(["mon", "tue"]);
  });
});
