import plans from "@shaperoute/shared-types/fixtures/gym-plans.json";
import type { GymPlan, GymProgram } from "@shaperoute/shared-types";

import {
  adaptDayOf,
  adapts,
  answerDay,
  answered,
  answerTitle,
  canAdapt,
  markOf,
  nextTime,
  withAdapt,
} from "./adapt";
import type { KeptPlan } from "./plans";
import { sessionsOfWeek } from "./program";

// The plan that adapts to how its workouts went (TASK-488, ADR-0396): the
// answers' steps, the marks, what changes next time.

const [, , MUSCLE, LIFT_AND_RUN, TO_60] = plans.plans as GymPlan[];
const muscle = MUSCLE.program as GymProgram;
const { adapt: _adapt, ...liftAndRun } = LIFT_AND_RUN.program as GymProgram;
const monday = muscle.sessions[0];
const MONDAY = new Date(2026, 10, 2, 18);
const kept = (plan: GymPlan): KeptPlan => ({ ...plan, owner: 1, state: "sent" });

test("easy is a step more, right as planned, hard holds the step and then steps back", () => {
  expect(answerDay(muscle, monday, "easy")).toEqual({
    day: 1,
    steps: 1,
    hard: 0,
    last: "easy",
  });
  expect(answerDay(muscle, monday, "right")).toEqual({
    day: 1,
    steps: 0,
    hard: 0,
    last: "right",
  });
  // The first «Hard» holds next week's step; the second steps back one more.
  const once = answered(muscle, monday, "hard");
  expect(once.adapt).toEqual({
    off: false,
    days: [{ day: 1, steps: -1, hard: 1, last: "hard" }],
  });
  const twice = answered(once, monday, "hard");
  expect(twice.adapt?.days).toEqual([{ day: 1, steps: -3, hard: 2, last: "hard" }]);
  // «Right» or «Easy» ends the row.
  expect(answered(twice, monday, "right").adapt?.days[0]).toMatchObject({
    steps: -3,
    hard: 0,
  });
  // «Always the same» does not grow: «Hard» once leaves it as it is.
  const same = { ...muscle, mode: "same" as const };
  expect(answerDay(same, monday, "hard").steps).toBe(0);
});

test("the steps go into every week of that day, and only that day", () => {
  const easy = answered(muscle, monday, "easy");
  const week2 = sessionsOfWeek(easy, 2);
  // Bench press: 62.5 kg in week 2, a step more: 65; the lateral raise
  // without kg a rep more; Wednesday as planned.
  expect(week2[0].items[0].load_kg).toBe(65);
  expect(week2[0].items[1].reps).toBe(13);
  expect(week2[1].items[0].load_kg).toBe(sessionsOfWeek(muscle, 2)[1].items[0].load_kg);
  // Turned off: as planned again, the answers kept for later.
  const off = withAdapt(easy, false);
  expect(adapts(off)).toBe(false);
  expect(sessionsOfWeek(off, 2)[0].items[0].load_kg).toBe(62.5);
  expect(off.adapt?.days).toHaveLength(1);
  expect(sessionsOfWeek(withAdapt(off, true), 2)[0].items[0].load_kg).toBe(65);
});

test("a run day grows a step more too", () => {
  const saturday = liftAndRun.sessions[3];
  const easy = answered(liftAndRun, saturday, "easy");
  // The long run of an hour made for its runner, five minutes a week: 65
  // minutes in week 2, a step more 70.
  expect(sessionsOfWeek(liftAndRun, 2)[3].run?.duration_s).toBe(3900);
  expect(sessionsOfWeek(easy, 2)[3].run?.duration_s).toBe(4200);
});

test("the marks beside the days: up, held, back; none for right or off", () => {
  const easy = answered(muscle, monday, "easy");
  expect(markOf(easy, 1)).toBe("↑");
  expect(markOf(easy, 3)).toBeNull();
  const once = answered(muscle, monday, "hard");
  expect(markOf(once, 1)).toBe("=");
  expect(markOf(answered(once, monday, "hard"), 1)).toBe("↓");
  expect(markOf(answered(muscle, monday, "right"), 1)).toBeNull();
  expect(markOf(withAdapt(easy, false), 1)).toBeNull();
  expect(answerTitle(answerDay(once, monday, "hard"))).toBe(
    "Hard again: one step back",
  );
});

test("what changes next time, beside today's", () => {
  const easy = answered(muscle, monday, "easy");
  expect(nextTime(muscle, easy, 1, MONDAY, "km", "en")).toEqual([
    { name: "Bench press", was: "60 kg", next: "65 kg" },
    { name: "Lateral raise", was: "12 reps", next: "13 reps" },
  ]);
  const saturday = liftAndRun.sessions[3];
  expect(
    nextTime(
      liftAndRun,
      answered(liftAndRun, saturday, "easy"),
      6,
      new Date(2026, 10, 7, 9),
      "km",
      "en",
    ),
  ).toEqual([{ name: "Long run", was: "60 min", next: "70 min" }]);
  // Before the plan starts: nothing to say.
  expect(nextTime(muscle, easy, 1, new Date(2026, 9, 26), "km", "en")).toEqual([]);
});

test("the day a workout or a run was: of its plan, a day that adapts", () => {
  const list = [kept(MUSCLE), kept(LIFT_AND_RUN)];
  expect(adaptDayOf(list, MONDAY, "gym", MUSCLE.key)?.session.day).toBe(1);
  // Tuesday: no workout in «Muscle»; a run day in «Lift and run».
  const tuesday = new Date(2026, 10, 3, 7);
  expect(adaptDayOf(list, tuesday, "gym", MUSCLE.key)).toBeNull();
  expect(adaptDayOf(list, tuesday, "run")?.plan.key).toBe(LIFT_AND_RUN.key);
  // Turned off: no question.
  const off = { ...MUSCLE, program: withAdapt(muscle, false) };
  expect(adaptDayOf([kept(off)], MONDAY, "gym", MUSCLE.key)).toBeNull();
  // A day out of another sport keeps its own steps to the target.
  const to60 = TO_60.program as GymProgram;
  const ride = to60.sessions.find((one) => one.outing !== undefined)!;
  expect(canAdapt(to60, ride)).toBe(false);
  expect(canAdapt(to60, to60.sessions[0])).toBe(true);
});
