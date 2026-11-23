import type { Food } from "./foods";
import {
  copyDay,
  gramsOf,
  isEmptyMeals,
  isEmptyPlan,
  mealsFrom,
  NO_MEALS,
  NO_PLAN,
  planFrom,
  planWithDay,
  planWithFood,
  portionOf,
  withGrams,
  withoutPortion,
  withPortion,
} from "./plan";

function food(key: string, name: string, kcalPer100g: number): Food {
  return {
    key,
    name,
    kcalPer100g,
    proteinPer100g: null,
    carbsPer100g: null,
    fatPer100g: null,
    source: key.startsWith("own-") ? "own" : "table",
  };
}

const OATS = food("usda-1", "Oats", 379);
const MILK = food("usda-2", "Milk, whole", 61);
const GRANOLA = food("own-1", "Granola", 450);

test("a portion weighs whole grams, from 1 to 5000", () => {
  expect(gramsOf(60)).toBe(60);
  expect(gramsOf(60.4)).toBe(60);
  expect(gramsOf(0.6)).toBe(1);
  expect(gramsOf(0.4)).toBeNull();
  expect(gramsOf(0)).toBeNull();
  expect(gramsOf(5001)).toBeNull();
  expect(gramsOf(Number.NaN)).toBeNull();
  expect(gramsOf("60")).toBeNull();
  expect(portionOf(OATS, 60)).toEqual({ food: OATS, grams: 60 });
  expect(portionOf(OATS, -5)).toBeNull();
});

test("portions are added to a meal in order", () => {
  const meals = withPortion(
    withPortion(NO_MEALS, "breakfast", { food: OATS, grams: 60 }),
    "breakfast",
    { food: MILK, grams: 200 },
  );
  expect(meals.breakfast).toEqual([
    { food: OATS, grams: 60 },
    { food: MILK, grams: 200 },
  ]);
  expect(meals.lunch).toEqual([]);
  // The meals with nothing are untouched, and so is where it started from.
  expect(NO_MEALS.breakfast).toEqual([]);
});

test("the grams of a portion change, the rest stays", () => {
  const meals = withPortion(NO_MEALS, "lunch", { food: OATS, grams: 60 });
  expect(withGrams(meals, "lunch", 0, 80).lunch).toEqual([{ food: OATS, grams: 80 }]);
  expect(withGrams(meals, "lunch", 0, 0)).toBe(meals);
  expect(withGrams(meals, "lunch", 3, 80)).toBe(meals);
  expect(withGrams(meals, "dinner", 0, 80)).toBe(meals);
});

test("a portion is taken away, and a day with none is empty", () => {
  const meals = withPortion(NO_MEALS, "snacks", { food: GRANOLA, grams: 30 });
  expect(isEmptyMeals(meals)).toBe(false);
  expect(isEmptyMeals(withoutPortion(meals, "snacks", 0))).toBe(true);
  expect(withoutPortion(meals, "snacks", 5).snacks).toHaveLength(1);
});

test("a day of the plan is copied over another", () => {
  const monday = withPortion(NO_MEALS, "breakfast", { food: OATS, grams: 60 });
  const plan = copyDay(planWithDay(NO_PLAN, "mon", monday), "mon", "thu");
  expect(plan.thu).toEqual(monday);
  expect(plan.tue).toEqual(NO_MEALS);
  expect(isEmptyPlan(plan)).toBe(false);
  expect(isEmptyPlan(NO_PLAN)).toBe(true);
});

test("a food rewritten counts as it is now everywhere in the plan", () => {
  const day = withPortion(
    withPortion(NO_MEALS, "breakfast", { food: GRANOLA, grams: 40 }),
    "breakfast",
    { food: MILK, grams: 200 },
  );
  const plan = planWithDay(planWithDay(NO_PLAN, "mon", day), "sat", day);
  const richer = { ...GRANOLA, kcalPer100g: 470 };
  const renewed = planWithFood(plan, richer);
  expect(renewed.mon.breakfast[0]).toEqual({ food: richer, grams: 40 });
  expect(renewed.sat.breakfast[0]).toEqual({ food: richer, grams: 40 });
  expect(renewed.mon.breakfast[1]).toEqual({ food: MILK, grams: 200 });
  expect(plan.mon.breakfast[0].food.kcalPer100g).toBe(450);
});

test("a plan kept reads back the same", () => {
  const day = withPortion(NO_MEALS, "dinner", { food: OATS, grams: 55 });
  const plan = planWithDay(NO_PLAN, "sun", day);
  expect(planFrom(JSON.parse(JSON.stringify(plan)))).toEqual(plan);
});

test("what does not read is left out, never guessed", () => {
  expect(planFrom(null)).toEqual(NO_PLAN);
  expect(planFrom({ mon: "pasta" })).toEqual(NO_PLAN);
  expect(
    mealsFrom({
      breakfast: [
        { food: OATS, grams: 60 },
        { food: OATS, grams: 0 },
        { food: { name: "No key" }, grams: 50 },
        "milk",
      ],
      lunch: { food: OATS, grams: 60 },
    }),
  ).toEqual({ ...NO_MEALS, breakfast: [{ food: OATS, grams: 60 }] });
});
