import type { BodyProfile } from "./bodyProfile";
import {
  cheersDue,
  directionOf,
  goalAllowed,
  goalDoor,
  goalProgress,
  milestoneAllowed,
  minGoalKg,
  reached,
  weightCheersAllowed,
  withCheered,
  withGoal,
  withMilestone,
  withoutMilestone,
} from "./weightGoal";
import { NO_WEIGH_INS, type WeighIns } from "./weighIns";

const YEAR = 2026;
const ADULT: BodyProfile = {
  sex: "female",
  weightKg: 80,
  heightCm: 175,
  birthYear: 1990,
};

function kept(entries: [string, number][], more: Partial<WeighIns> = {}): WeighIns {
  return {
    ...NO_WEIGH_INS,
    entries: entries.map(([day, kg]) => ({ day, kg })),
    ...more,
  };
}

test("the lowest goal is a body mass index of 18.5 for the height, up to a tenth", () => {
  // 18.5 × 1.75² = 56.656…
  expect(minGoalKg(175)).toBe(56.7);
  expect(minGoalKg(160)).toBe(47.4);
});

test("a goal needs the height and the year of birth, and an adult", () => {
  expect(goalDoor(ADULT, YEAR)).toEqual({ kind: "open", minKg: 56.7 });
  expect(goalDoor({ ...ADULT, heightCm: null }, YEAR)).toEqual({ kind: "data" });
  expect(goalDoor({ ...ADULT, birthYear: null }, YEAR)).toEqual({ kind: "data" });
  expect(goalDoor({ ...ADULT, birthYear: 2010 }, YEAR)).toEqual({ kind: "under18" });
  // Who turns 18 this year may still be 17.
  expect(goalDoor({ ...ADULT, birthYear: 2008 }, YEAR)).toEqual({ kind: "under18" });
  expect(goalDoor({ ...ADULT, birthYear: 2007 }, YEAR).kind).toBe("open");
});

test("a goal cannot be written under the threshold", () => {
  const door = goalDoor(ADULT, YEAR);
  expect(goalAllowed(door, 56.7)).toBe(true);
  expect(goalAllowed(door, 56.6)).toBe(false);
  expect(goalAllowed({ kind: "under18" }, 70)).toBe(false);
});

test("milestones go strictly between the start and the goal, either way", () => {
  const lose = { kg: 76, fromKg: 80 };
  expect(milestoneAllowed(lose, 78)).toBe(true);
  expect(milestoneAllowed(lose, 80)).toBe(false);
  expect(milestoneAllowed(lose, 76)).toBe(false);
  expect(milestoneAllowed(lose, 82)).toBe(false);
  const gain = { kg: 60, fromKg: 55 };
  expect(milestoneAllowed(gain, 57)).toBe(true);
  expect(directionOf(gain)).toBe(1);
  // Keeping a weight leaves no room for a milestone.
  expect(milestoneAllowed({ kg: 70, fromKg: 70 }, 70)).toBe(false);
  expect(directionOf({ kg: 70, fromKg: 70 })).toBe(0);
});

test("reached follows the way to the goal; progress never goes past it", () => {
  const lose = { kg: 76, fromKg: 80 };
  expect(reached(lose, 78, 78.1)).toBe(false);
  expect(reached(lose, 78, 77.9)).toBe(true);
  const gain = { kg: 60, fromKg: 55 };
  expect(reached(gain, 57, 57)).toBe(true);
  expect(reached(gain, 57, 56)).toBe(false);
  expect(goalProgress(lose, 77.2)?.doneKg).toBeCloseTo(2.8);
  expect(goalProgress(lose, 77.2)?.totalKg).toBe(4);
  expect(goalProgress(lose, 81)?.doneKg).toBe(0);
  expect(goalProgress(lose, 70)?.doneKg).toBe(4);
  expect(goalProgress({ kg: 70, fromKg: 70 }, 70)).toBeNull();
});

test("no congratulation on the weight under the threshold or under 18", () => {
  expect(weightCheersAllowed(ADULT, YEAR, 60)).toBe(true);
  expect(weightCheersAllowed(ADULT, YEAR, 56)).toBe(false);
  expect(weightCheersAllowed({ ...ADULT, birthYear: 2009 }, YEAR, 60)).toBe(false);
});

test("the congratulations due: the goal, the milestones reached, then the steadiness", () => {
  const weighIns = kept(
    [
      ["2026-09-04", 80],
      ["2026-09-18", 79],
      ["2026-10-02", 78.5],
      ["2026-10-16", 77.5],
      ["2026-10-30", 75.9],
    ],
    { goal: { kg: 76, fromKg: 80 }, milestones: [79, 78] },
  );
  expect(cheersDue(weighIns, ADULT, YEAR, 31).map((cheer) => cheer.key)).toEqual([
    "goal:76.0",
    "milestone:78.0",
    "milestone:79.0",
    "weighIns:5",
    "diaryDays:30",
  ]);
});

test("under 18 only the steadiness is celebrated", () => {
  const weighIns = kept(
    [
      ["2026-09-04", 60],
      ["2026-09-18", 59],
      ["2026-10-02", 58],
      ["2026-10-16", 57],
      ["2026-10-30", 56],
    ],
    { goal: { kg: 56, fromKg: 60 }, milestones: [58] },
  );
  const young = { ...ADULT, heightCm: 165, birthYear: 2010 };
  expect(cheersDue(weighIns, young, YEAR, 0).map((cheer) => cheer.kind)).toEqual([
    "weighIns",
  ]);
});

test("a congratulation shown does not come back, nor the smaller ones of its kind", () => {
  const weighIns = kept(
    Array.from({ length: 25 }, (_, index): [string, number] => [
      `2026-${String(1 + Math.floor(index / 28)).padStart(2, "0")}-${String(1 + (index % 28)).padStart(2, "0")}`,
      80,
    ]),
  );
  const [first] = cheersDue(weighIns, ADULT, YEAR, 0);
  expect(first).toEqual({ kind: "weighIns", key: "weighIns:25", count: 25 });
  const seen = withCheered(weighIns, first);
  expect(seen.celebrated).toEqual(
    expect.arrayContaining(["weighIns:5", "weighIns:10", "weighIns:25"]),
  );
  expect(cheersDue(seen, ADULT, YEAR, 0)).toEqual([]);
});

test("a new goal drops the old milestones and their congratulations", () => {
  const before = kept([["2026-11-27", 78]], {
    goal: { kg: 76, fromKg: 80 },
    milestones: [78],
    celebrated: ["milestone:78.0", "weighIns:5"],
  });
  const after = withGoal(before, 74, 78);
  expect(after.goal).toEqual({ kg: 74, fromKg: 78 });
  expect(after.milestones).toEqual([]);
  expect(after.celebrated).toEqual(["weighIns:5"]);
  expect(withGoal(before, null, 78).goal).toBeNull();
});

test("a milestone outside the way is not added; one can be taken away", () => {
  const withGoalSet = kept([], { goal: { kg: 76, fromKg: 80 } });
  expect(withMilestone(withGoalSet, 82)).toBe(withGoalSet);
  const one = withMilestone(withGoalSet, 78);
  expect(one.milestones).toEqual([78]);
  expect(withMilestone(one, 78).milestones).toEqual([78]);
  expect(withoutMilestone(one, 78).milestones).toEqual([]);
});
