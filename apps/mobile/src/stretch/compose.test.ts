import { CATEGORIES } from "./categories";
import {
  category,
  type Choice,
  compose,
  defaultChoice,
  EASY,
  HOLDS,
  type Level,
  MAX_ROUNDS,
  MIN_EXERCISES,
  offers,
  pool,
  settle,
  slack,
  type Where,
} from "./compose";
import { sessionSeconds } from "./exercises";

const LEVELS: readonly Level[] = ["gentle", "intense"];
const WHERES: readonly Where[] = ["any", "standing"];

/** Every choice every category offers. */
const OFFERED = CATEGORIES.flatMap((c) =>
  c.minutes.flatMap((minutes) =>
    LEVELS.flatMap((level) =>
      WHERES.map((where): Choice => ({ minutes, level, where }))
        .filter((choice) => offers(c, choice))
        .map((choice) => ({ c, choice })),
    ),
  ),
);

const keys = (key: string, asked: Partial<Choice> = {}) => {
  const c = category(key);
  return compose(c, { ...defaultChoice(c), ...asked }).exercises.map((e) => e.key);
};

describe("a routine made from a category and a choice", () => {
  it("is always the same one", () => {
    for (const { c, choice } of OFFERED) {
      expect(compose(c, choice)).toEqual(compose(c, choice));
    }
    expect(OFFERED.length).toBeGreaterThan(400);
  });

  it("fills its minutes, «Get ready» and «Switch sides» counted", () => {
    for (const { c, choice } of OFFERED) {
      const routine = compose(c, choice);
      expect(routine.choice).toEqual(choice);
      expect(routine.seconds).toBe(sessionSeconds(routine.exercises));
      expect({
        key: c.key,
        choice,
        off: Math.abs(routine.seconds - choice.minutes * 60) <= slack(choice.minutes),
      }).toEqual({ key: c.key, choice, off: true });
    }
    // Twenty seconds on a short one, a minute on twenty minutes.
    expect(slack(3)).toBe(20);
    expect(slack(5)).toBe(20);
    expect(slack(10)).toBe(30);
    expect(slack(20)).toBe(60);
  });

  it("keeps to the level and the place asked", () => {
    for (const { c, choice } of OFFERED) {
      const { exercises } = compose(c, choice);
      expect(exercises.length).toBeGreaterThanOrEqual(MIN_EXERCISES);
      for (const exercise of exercises) {
        expect(c.exercises).toContain(exercise.key);
        if (choice.level === "gentle") {
          expect(exercise.level).not.toBe("intense");
        }
        if (choice.where === "standing") {
          expect(exercise.position).not.toBe("floor");
        }
      }
      // «Intense» is offered only where it adds a deep stretch to choose from.
      if (choice.level === "intense") {
        expect(
          pool(c, "intense", choice.where).some(
            (exercise) => exercise.level === "intense",
          ),
        ).toBe(true);
      }
    }
  });

  it("holds everything for one time, a rest for twice that", () => {
    for (const { c, choice } of OFFERED) {
      const { exercises, hold } = compose(c, choice);
      expect(HOLDS).toContain(hold);
      for (const exercise of exercises) {
        const rest = exercise.key === "legsUpWall" || exercise.key === "restBreath";
        expect(exercise.seconds).toBe(rest ? 2 * hold : hold);
      }
    }
  });

  it("goes round a short list again rather than leave the minutes short, three times at most, never the same twice in a row", () => {
    let again = 0;
    for (const { c, choice } of OFFERED) {
      const done = compose(c, choice).exercises.map((exercise) => exercise.key);
      const times = new Map<string, number>();
      done.forEach((key, i) => {
        times.set(key, (times.get(key) ?? 0) + 1);
        expect({ key: c.key, choice, twice: key === done[i - 1] }).toEqual({
          key: c.key,
          choice,
          twice: false,
        });
      });
      const most = Math.max(...times.values());
      expect(most).toBeLessThanOrEqual(MAX_ROUNDS);
      again += most > 1 ? 1 : 0;
      // A second round only once every exercise that fits is in.
      if (most > 1) {
        expect(times.size).toBe(pool(c, choice.level, choice.where).length);
      }
    }
    // Most routines have enough of their own.
    expect(again).toBeLessThan(OFFERED.length / 2);
  });

  it("holds longer than the level is easy with only when once round does not fill the minutes", () => {
    for (const { c, choice } of OFFERED) {
      const { exercises, hold } = compose(c, choice);
      if (hold > EASY[choice.level]) {
        expect(new Set(exercises.map((e) => e.key)).size).toBe(
          pool(c, choice.level, choice.where).length,
        );
      }
    }
    expect(EASY.gentle).toBeLessThan(EASY.intense);
  });

  it("is done standing first and on the floor after in each round, the rests last", () => {
    const rank = (exercise: { key: string; position?: string }) =>
      exercise.key === "legsUpWall" || exercise.key === "restBreath"
        ? 2
        : exercise.position === "floor"
          ? 1
          : 0;
    for (const { c, choice } of OFFERED) {
      const { exercises } = compose(c, choice);
      const size = pool(c, choice.level, choice.where).length;
      const seen = new Set<string>();
      let round: typeof exercises = [];
      const rounds = [round];
      for (const exercise of exercises) {
        if (seen.has(exercise.key) && round.some((e) => e.key === exercise.key)) {
          round = [];
          rounds.push(round);
        }
        seen.add(exercise.key);
        round.push(exercise);
      }
      for (const part of rounds) {
        expect(part.length).toBeLessThanOrEqual(size);
        for (let i = 1; i < part.length; i += 1) {
          expect(rank(part[i])).toBeGreaterThanOrEqual(rank(part[i - 1]));
        }
      }
    }
  });
});

describe("what a category offers", () => {
  it("has every one of its lengths with a mat, and gentle everywhere but the splits", () => {
    for (const c of CATEGORIES) {
      for (const minutes of c.minutes) {
        const gentle = offers(c, { minutes, level: "gentle", where: "any" });
        const intense = offers(c, { minutes, level: "intense", where: "any" });
        expect({ key: c.key, minutes, some: gentle || intense }).toEqual({
          key: c.key,
          minutes,
          some: true,
        });
        expect({ key: c.key, minutes, gentle }).toEqual({
          key: c.key,
          minutes,
          gentle: c.key !== "splits",
        });
      }
      // A length it does not come in is not offered.
      expect(offers(c, { minutes: 7, level: "gentle", where: "any" })).toBe(false);
    }
  });

  it("offers «Intense» where there are deep stretches and standing only where enough is done standing", () => {
    const can = (key: string, level: Level, where: Where, minutes = 5) =>
      offers(category(key), { minutes, level, where });
    expect(can("neck", "intense", "any")).toBe(false);
    expect(can("desk", "intense", "any")).toBe(false);
    expect(can("hips", "intense", "any")).toBe(true);
    expect(can("legs", "intense", "standing")).toBe(true);
    expect(can("desk", "gentle", "standing")).toBe(true);
    expect(can("neck", "gentle", "standing")).toBe(true);
    // All on the floor: no standing version.
    expect(can("relax", "gentle", "standing")).toBe(false);
    expect(can("intimacy_after", "gentle", "standing")).toBe(false);
    expect(can("glutes", "gentle", "standing")).toBe(false);
  });

  it("proposes five minutes, gentle, with a mat; or the nearest it has", () => {
    for (const c of CATEGORIES) {
      const first = defaultChoice(c);
      expect(offers(c, first)).toBe(true);
      expect(first.where).toBe("any");
      if (c.minutes.includes(5) && c.key !== "splits") {
        expect(first).toEqual({ minutes: 5, level: "gentle", where: "any" });
      }
    }
    expect(defaultChoice(category("toes"))).toEqual({
      minutes: 10,
      level: "gentle",
      where: "any",
    });
    expect(defaultChoice(category("splits"))).toEqual({
      minutes: 15,
      level: "intense",
      where: "any",
    });
  });

  it("settles a choice it does not have on the nearest one", () => {
    const desk = category("desk");
    // The closest length, the shorter of two as near.
    expect(settle(desk, { minutes: 10, level: "gentle", where: "any" }).minutes).toBe(
      5,
    );
    expect(settle(desk, { minutes: 4, level: "gentle", where: "any" }).minutes).toBe(3);
    // The other level before the other place.
    expect(settle(desk, { minutes: 5, level: "intense", where: "standing" })).toEqual({
      minutes: 5,
      level: "gentle",
      where: "standing",
    });
    expect(
      settle(category("relax"), { minutes: 10, level: "intense", where: "standing" }),
    ).toEqual({ minutes: 10, level: "gentle", where: "any" });
    // What it has stays as asked.
    const asked: Choice = { minutes: 15, level: "intense", where: "any" };
    expect(settle(category("hips"), asked)).toEqual(asked);
    expect(compose(category("relax"), { ...asked, where: "standing" }).choice).toEqual({
      minutes: 15,
      level: "gentle",
      where: "any",
    });
    expect(() => category("nowhere")).toThrow("no stretching category nowhere");
  });
});

describe("some routines, as they come out", () => {
  it("keeps the five classics after a run in five minutes, and adds the floor in ten", () => {
    expect(keys("running_after")).toEqual([
      "quad",
      "hamstring",
      "calf",
      "glute",
      "hipFlexor",
    ]);
    const ten = keys("running_after", { minutes: 10 });
    expect(ten.slice(0, 4)).toEqual(["quad", "hamstring", "calf", "glute"]);
    expect(ten).toContain("lyingTwist");
    expect(ten.length).toBeGreaterThan(5);
    expect(new Set(ten).size).toBe(ten.length);
  });

  it("warms up before a run with movements, twice round in ten minutes", () => {
    const five = keys("running_before");
    expect(five).toEqual([
      "hipCircles",
      "legSwings",
      "calfRaises",
      "ankleCircles",
      "bridge",
    ]);
    expect(keys("running_before", { minutes: 10 })).toEqual([...five, ...five]);
  });

  it("adds the deep stretches when asked «Intense»", () => {
    const gentle = keys("hips", { minutes: 10 });
    const intense = keys("hips", { minutes: 10, level: "intense" });
    for (const deep of ["lizard", "frog", "pigeon"]) {
      expect(gentle).not.toContain(deep);
    }
    expect(intense.some((key) => ["lizard", "frog", "deepSquat"].includes(key))).toBe(
      true,
    );
  });

  it("stays off the floor at the desk when asked standing only", () => {
    expect(keys("desk", { minutes: 3, where: "standing" })).toEqual([
      "neck",
      "overheadReach",
      "chest",
      "upperBack",
      "neckSide",
      "neckTurn",
    ]);
  });

  it("ends a slow one with its rests, each held twice as long", () => {
    const c = category("bedtime");
    const { exercises, hold } = compose(c, {
      minutes: 10,
      level: "gentle",
      where: "any",
    });
    const last = exercises[exercises.length - 1];
    expect(last.key).toBe("legsUpWall");
    expect(last.seconds).toBe(2 * hold);
    expect(exercises[0].position).not.toBe("floor");
  });
});
