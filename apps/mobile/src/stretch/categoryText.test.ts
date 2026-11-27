import { CATEGORIES } from "./categories";
import {
  BACK_CATEGORIES,
  categoriesOf,
  categoryName,
  GROUPS,
  lengthsLine,
  pairOf,
  SPORT_NAMES,
  sportOf,
  todayLine,
} from "./categoryText";
import { category } from "./compose";

describe("the words of the stretching categories", () => {
  it("name every category, a sport by its name and when", () => {
    for (const c of CATEGORIES) {
      expect(categoryName(c.key).length).toBeGreaterThan(2);
    }
    expect(categoryName("neck")).toBe("Neck");
    expect(categoryName("arms")).toBe("Arms & wrists");
    expect(categoryName("running_after")).toBe("Running · After");
    expect(categoryName("skiTouring_before")).toBe("Ski touring · Before");
    expect(categoryName("intimacy_before")).toBe("Before intimacy");
    // Two words that mean something else elsewhere in the app: in English
    // they read the same, without their mark.
    expect(categoryName("splits")).toBe("Splits");
    expect(categoryName("football_after")).toBe("Football · After");
    expect(() => categoryName("nowhere")).toThrow("no name");
  });

  it("have one name for each sport of the catalog", () => {
    const sports = new Set(
      CATEGORIES.filter((c) => c.group === "sports").map((c) => pairOf(c.key)?.of),
    );
    expect([...sports].sort()).toEqual(Object.keys(SPORT_NAMES).sort());
    expect(Object.keys(SPORT_NAMES)).toHaveLength(14);
  });

  it("tell a key with a before and an after from one that is one thing", () => {
    expect(pairOf("running_after")).toEqual({ of: "running", when: "after" });
    expect(pairOf("intimacy_before")).toEqual({ of: "intimacy", when: "before" });
    expect(pairOf("afterSitting")).toBeNull();
    expect(pairOf("neck")).toBeNull();
    expect(sportOf("gym_before")).toEqual({ sport: "gym", when: "before" });
    // Intimacy has the two halves and is not a sport.
    expect(sportOf("intimacy_after")).toBeNull();
    expect(sportOf("morning")).toBeNull();
  });

  it("put the five groups in the home's order, every category in one", () => {
    expect(GROUPS.map((group) => group.key)).toEqual([
      "body",
      "moments",
      "sports",
      "intimacy",
      "more",
    ]);
    const all = GROUPS.flatMap((group) => categoriesOf(group.key));
    expect(all).toHaveLength(CATEGORIES.length);
    expect(categoriesOf("body")).toHaveLength(12);
    expect(categoriesOf("moments")[0].key).toBe("morning");
  });

  it("say a category's lengths on one line", () => {
    expect(lengthsLine(category("neck"))).toBe("3 · 5 · 10 min");
    expect(lengthsLine(category("toes"))).toBe("10 min");
    expect(lengthsLine(category("intimacy_before"))).toBe("5 · 10 min");
    // More than three do not fit a tile: from the shortest to the longest.
    expect(lengthsLine(category("hips"))).toBe("3–20 min");
    expect(lengthsLine(category("legs"))).toBe("3–15 min");
  });

  it("have a line for each thing «Today» proposes by the hour", () => {
    expect(todayLine("morning")).toBe("A good start to the day");
    expect(todayLine("bedtime")).toBe("Wind down before sleep");
    expect(todayLine("desk")).toBe("A break from sitting");
    expect(todayLine("fullBody")).toBe("A little of everything");
    // After a sport just done; a warm-up has no line.
    expect(todayLine("running_after")).toBe("After your activity today");
    expect(todayLine("gym_after")).toBe("After your activity today");
    expect(todayLine("running_before")).toBeNull();
    expect(todayLine("neck")).toBeNull();
  });

  it("know the two categories for the back", () => {
    expect(BACK_CATEGORIES).toEqual(["lowerBack", "backCare"]);
    for (const key of BACK_CATEGORIES) {
      expect(category(key).key).toBe(key);
    }
  });
});
