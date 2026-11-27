import { ALL_EXERCISES, exerciseByKey, isMove } from "./allExercises";
import { CATEGORIES } from "./categories";

const SPORTS = [
  "running",
  "cycling",
  "swimming",
  "skiing",
  "snowboarding",
  "skiTouring",
  "gym",
  "motorbike",
  "hiking",
  "climbing",
  "paddling",
  "football",
  "racket",
  "golf",
];

const of = (key: string) => {
  const found = CATEGORIES.find((c) => c.key === key);
  if (found === undefined) {
    throw new Error(key);
  }
  return found;
};

describe("the stretching categories", () => {
  it("are the 54 of the approved map, under keys that never change", () => {
    expect(CATEGORIES.map((c) => c.key)).toEqual([
      "neck",
      "shoulders",
      "arms",
      "chest",
      "upperBack",
      "lowerBack",
      "hips",
      "glutes",
      "legs",
      "calves",
      "feet",
      "fullBody",
      "morning",
      "bedtime",
      "desk",
      "afterSitting",
      "afterTravel",
      "posture",
      "relax",
      ...SPORTS.flatMap((sport) => [`${sport}.before`, `${sport}.after`]),
      "intimacy.before",
      "intimacy.after",
      "beginners",
      "joints",
      "backCare",
      "toes",
      "splits",
    ]);
    const count = (group: string) => CATEGORIES.filter((c) => c.group === group).length;
    expect(count("body")).toBe(12);
    expect(count("moments")).toBe(7);
    expect(count("sports")).toBe(28);
    expect(count("intimacy")).toBe(2);
    expect(count("more")).toBe(5);
  });

  it("name only exercises there are, none twice, and leave none of the 65 out", () => {
    const used = new Set<string>();
    for (const c of CATEGORIES) {
      expect(new Set(c.exercises).size).toBe(c.exercises.length);
      for (const key of c.exercises) {
        expect({
          category: c.key,
          key,
          known: exerciseByKey(key) !== undefined,
        }).toEqual({
          category: c.key,
          key,
          known: true,
        });
        used.add(key);
      }
    }
    expect(ALL_EXERCISES).toHaveLength(65);
    expect(ALL_EXERCISES.filter((exercise) => !used.has(exercise.key))).toEqual([]);
  });

  it("have as many exercises as the approved list counted", () => {
    const sizes = Object.fromEntries(
      CATEGORIES.map((c) => [c.key, c.exercises.length]),
    );
    expect(sizes).toMatchObject({
      calves: 6,
      bedtime: 13,
      desk: 16,
      relax: 6,
      "running.after": 18,
      "racket.before": 10,
      "intimacy.before": 5,
      "intimacy.after": 4,
      beginners: 9,
      joints: 11,
      backCare: 11,
      toes: 6,
      splits: 7,
    });
    for (const c of CATEGORIES) {
      if (c.group === "body" || c.group === "moments") {
        expect(c.exercises.length).toBeGreaterThanOrEqual(6);
      }
      if (c.key.endsWith(".before") && c.group === "sports") {
        expect(c.exercises.length).toBeGreaterThanOrEqual(5);
        expect(c.exercises.length).toBeLessThanOrEqual(10);
      }
      if (c.key.endsWith(".after") && c.group === "sports") {
        expect(c.exercises.length).toBeGreaterThanOrEqual(6);
        expect(c.exercises.length).toBeLessThanOrEqual(18);
      }
    }
  });

  it("warm up with movements before a sport and hold stretches after it", () => {
    const moves = (key: string) =>
      of(key).exercises.filter((k) => isMove(exerciseByKey(k)!)).length;
    for (const sport of SPORTS) {
      const before = of(`${sport}.before`);
      const after = of(`${sport}.after`);
      // Most of a warm-up moves; before a swim two of the five do, with the
      // holds that open the shoulders and the ankles.
      expect(moves(before.key)).toBeGreaterThanOrEqual(2);
      if (sport !== "swimming") {
        expect(moves(before.key)).toBeGreaterThan(before.exercises.length / 2);
      }
      // After, one movement at most (the open book after a swim).
      expect(moves(after.key)).toBeLessThanOrEqual(1);
      expect(before.minutes).toEqual([3, 5, 10]);
      expect(after.minutes).toEqual([3, 5, 10, 15]);
    }
  });

  it("begin with what each is for: the exercises that name it first", () => {
    expect(of("neck").exercises.slice(0, 2)).toEqual(["neck", "upperBack"]);
    expect(of("running.after").exercises.slice(0, 6)).toEqual([
      "quad",
      "hamstring",
      "calf",
      "hipFlexor",
      "glute",
      "forwardFold",
    ]);
    expect(of("gym.after").exercises.slice(0, 4)).toEqual([
      "quad",
      "shoulder",
      "chest",
      "triceps",
    ]);
    expect(of("morning").exercises[0]).toBe("overheadReach");
    expect(of("relax").exercises.slice(0, 2)).toEqual(["legsUpWall", "restBreath"]);
    // The two of «Intimacy», as the approved list wrote them.
    expect(of("intimacy.before").exercises).toEqual([
      "catCow",
      "pelvicTilt",
      "hipCircles",
      "bridge",
      "butterfly",
    ]);
    expect(of("intimacy.after").exercises).toEqual([
      "lyingTwist",
      "figureFour",
      "child",
      "restBreath",
    ]);
  });

  it("come in the lengths of the approved map", () => {
    const minutes = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.minutes]));
    expect(minutes).toMatchObject({
      neck: [3, 5, 10],
      lowerBack: [3, 5, 10, 15],
      hips: [3, 5, 10, 15, 20],
      legs: [3, 5, 10, 15],
      fullBody: [3, 5, 10, 15, 20],
      morning: [3, 5, 10, 15],
      bedtime: [3, 5, 10, 15, 20],
      desk: [3, 5],
      afterSitting: [5, 10],
      afterTravel: [5, 10],
      posture: [5, 10, 15],
      relax: [3, 5, 10, 15, 20],
      "intimacy.before": [5, 10],
      "intimacy.after": [5, 10],
      beginners: [3, 5, 10],
      toes: [10],
      splits: [15, 20],
    });
    for (const c of CATEGORIES) {
      expect([...c.minutes].sort((a, b) => a - b)).toEqual(c.minutes);
      for (const length of c.minutes) {
        expect([3, 5, 10, 15, 20]).toContain(length);
      }
    }
  });
});
