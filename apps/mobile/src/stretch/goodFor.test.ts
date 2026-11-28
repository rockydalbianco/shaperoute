import { ALL_EXERCISES } from "./allExercises";
import { CATEGORIES } from "./categories";
import { goodFor } from "./goodFor";

describe("what an exercise is good for", () => {
  it("is the categories that have it, the body's areas first", () => {
    expect(goodFor("hipFlexor").slice(0, 3)).toEqual([
      "hips",
      "afterSitting",
      "afterTravel",
    ]);
    expect(goodFor("hipFlexor")).toContain("running_after");
    expect(goodFor("hipFlexor")).toContain("splits");
    expect(goodFor("frog")).toEqual(["hips", "splits"]);
    // In the catalog's order.
    const order = CATEGORIES.map((category) => category.key);
    const found = goodFor("hipCircles").map((key) => order.indexOf(key));
    expect([...found].sort((a, b) => a - b)).toEqual(found);
  });

  it("is something for every exercise, nothing for one there is not", () => {
    for (const exercise of ALL_EXERCISES) {
      expect(goodFor(exercise.key).length).toBeGreaterThan(0);
    }
    expect(goodFor("nothing")).toEqual([]);
  });
});
