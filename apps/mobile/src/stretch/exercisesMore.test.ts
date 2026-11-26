import { EXERCISES, MORE_EXERCISES } from "./exercises";
import { NEW_EXERCISES } from "./exercisesMore";
import { BREATH_MAX_DEGREES, SEGMENTS } from "./poses";

/** The first block of TASK-520 part B, in the order of the approved list. */
const B1 = [
  "threadNeedle",
  "sideReachChild",
  "wristFlexor",
  "wristExtensor",
  "bicepsWall",
  "doorwayChest",
  "sphinx",
  "seatedTwist",
  "lizard",
  "deepSquat",
  "chairFigureFour",
  "soleus",
];

/** The second block: the stretches held sitting, kneeling or lying down. */
const B2 = [
  "ninetyNinety",
  "figureFour",
  "pigeon",
  "seatedFold",
  "lyingHamstring",
  "sideQuad",
  "halfSplit",
  "toeStretch",
  "shinStretch",
  "downDog",
  "legsUpWall",
  "restBreath",
];

/** The third block: the movements seen from the side. */
const B3 = [
  "chinTuck",
  "armCircles",
  "shoulderRolls",
  "wristCircles",
  "catCow",
  "pelvicTilt",
  "bridge",
  "legSwings",
  "lungeReach",
  "calfRaises",
  "ankleCircles",
  "inchworm",
];

describe("the exercises TASK-520 adds", () => {
  it("are the ones approved, each under its key, block after block", () => {
    expect(NEW_EXERCISES.map((exercise) => exercise.key)).toEqual([
      ...B1,
      ...B2,
      ...B3,
    ]);
  });

  it("take no key and no name of the fifteen of before", () => {
    const before = [...EXERCISES, ...MORE_EXERCISES];
    const keys = new Set(before.map((exercise) => exercise.key));
    const names = new Set(before.map((exercise) => exercise.name));
    const lines = new Set(before.map((exercise) => exercise.howTo));
    for (const exercise of NEW_EXERCISES) {
      expect(keys.has(exercise.key)).toBe(false);
      expect(names.has(exercise.name)).toBe(false);
      expect(lines.has(exercise.howTo)).toBe(false);
    }
    expect(new Set(NEW_EXERCISES.map((exercise) => exercise.name)).size).toBe(
      NEW_EXERCISES.length,
    );
  });

  it("each have a name, two short lines on how, a pose, and a breath of a few degrees when held", () => {
    for (const exercise of NEW_EXERCISES) {
      expect(exercise.name.length).toBeGreaterThan(2);
      expect(exercise.howTo.length).toBeGreaterThan(20);
      expect(exercise.howTo.length).toBeLessThan(90);
      for (const segment of SEGMENTS) {
        expect(typeof exercise.pose[segment]).toBe("number");
      }
      expect(exercise.breath).toBeDefined();
      for (const degrees of Object.values(exercise.breath ?? {})) {
        expect(Math.abs(degrees ?? 0)).toBeGreaterThan(0);
        // A movement is as wide as it needs; a breath is a few degrees.
        if (exercise.kind !== "move") {
          expect(Math.abs(degrees ?? 0)).toBeLessThanOrEqual(BREATH_MAX_DEGREES);
        }
      }
    }
  });

  it("are held for 20 or 30 seconds, a minute to rest, and say where and how hard they are", () => {
    const rest = ["legsUpWall", "restBreath"];
    for (const exercise of NEW_EXERCISES) {
      expect(exercise.seconds).toBe(
        rest.includes(exercise.key) ? 60 : exercise.seconds === 20 ? 20 : 30,
      );
      expect(["standing", "chair", "floor"]).toContain(exercise.position);
      expect(["gentle", "intense"]).toContain(exercise.level);
      // The first two blocks are held, the third moves; all seen from the side.
      if (B3.includes(exercise.key)) {
        expect(exercise.kind).toBe("move");
        expect(exercise.tempoMs).toBeGreaterThan(0);
        expect(exercise.seconds).toBe(30);
      } else {
        expect(exercise.kind).toBeUndefined();
        expect(exercise.tempoMs).toBeUndefined();
      }
      expect(exercise.front).toBeUndefined();
    }
  });

  it("keep the deep ones for whoever asks «Intense», and the chair for one", () => {
    const of = (key: string) => NEW_EXERCISES.find((exercise) => exercise.key === key);
    expect(of("lizard")?.level).toBe("intense");
    expect(of("deepSquat")?.level).toBe("intense");
    expect(of("chairFigureFour")?.position).toBe("chair");
    expect(of("sphinx")?.sides).toBe(false);
    expect(of("deepSquat")?.sides).toBe(false);
    expect(
      NEW_EXERCISES.filter((exercise) => exercise.level === "intense").map(
        (exercise) => exercise.key,
      ),
    ).toEqual([
      "lizard",
      "deepSquat",
      "pigeon",
      "seatedFold",
      "halfSplit",
      "toeStretch",
      "downDog",
      "lungeReach",
      "inchworm",
    ]);
  });

  it("moves in the third block: one side at a time for the leg, the lunge and the ankle", () => {
    const third = NEW_EXERCISES.filter((exercise) => B3.includes(exercise.key));
    expect(third).toHaveLength(B3.length);
    expect(third.filter((exercise) => exercise.sides).map((e) => e.key)).toEqual([
      "legSwings",
      "lungeReach",
      "ankleCircles",
    ]);
    expect(
      third.filter((exercise) => exercise.position === "floor").map((e) => e.key),
    ).toEqual(["catCow", "pelvicTilt", "bridge"]);
    expect(third.find((exercise) => exercise.key === "ankleCircles")?.position).toBe(
      "chair",
    );
  });

  it("puts the second block on the floor, one side at a time only where there are two", () => {
    const second = NEW_EXERCISES.filter((exercise) => B2.includes(exercise.key));
    expect(second).toHaveLength(B2.length);
    for (const exercise of second) {
      expect(exercise.position).toBe("floor");
    }
    expect(second.filter((exercise) => exercise.sides).map((e) => e.key)).toEqual([
      "ninetyNinety",
      "figureFour",
      "pigeon",
      "lyingHamstring",
      "sideQuad",
      "halfSplit",
    ]);
  });
});
