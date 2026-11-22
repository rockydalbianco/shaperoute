import type { Food } from "./foods";
import { intakeOf, plannedIntake, portionsKcal } from "./intake";
import { NO_MEALS, NO_PLAN, planWithDay, withPortion } from "./plan";

function food(key: string, kcalPer100g: number): Food {
  return {
    key,
    name: key,
    kcalPer100g,
    proteinPer100g: null,
    carbsPer100g: null,
    fatPer100g: null,
    source: "table",
  };
}

const OATS = food("oats", 379);
const MILK = food("milk", 61);
const PASTA = food("pasta", 371);
const WATER = food("water", 0);

test("the calories of a meal are its portions added up", () => {
  // 379 × 60 / 100 + 61 × 200 / 100 = 227.4 + 122
  expect(
    portionsKcal([
      { food: OATS, grams: 60 },
      { food: MILK, grams: 200 },
    ]),
  ).toBeCloseTo(349.4, 6);
  expect(portionsKcal([])).toBe(0);
});

test("a day adds up its meals and rounds once, at the end", () => {
  const meals = withPortion(
    withPortion(
      withPortion(NO_MEALS, "breakfast", { food: OATS, grams: 60 }),
      "breakfast",
      { food: MILK, grams: 200 },
    ),
    "lunch",
    { food: PASTA, grams: 90 },
  );
  // 349.4 + 333.9 = 683.3
  expect(intakeOf(meals)).toEqual({
    kcal: 683,
    meals: { breakfast: 349, lunch: 334, dinner: 0, snacks: 0 },
  });
});

test("the day is rounded from the whole sum, not from the rounded meals", () => {
  const half = food("half", 50);
  // Three meals of 0.5 kcal: 1.5 in all is 2, while each alone shows 1.
  const meals = {
    ...NO_MEALS,
    breakfast: [{ food: half, grams: 1 }],
    lunch: [{ food: half, grams: 1 }],
    dinner: [{ food: half, grams: 1 }],
  };
  expect(intakeOf(meals)).toEqual({
    kcal: 2,
    meals: { breakfast: 1, lunch: 1, dinner: 1, snacks: 0 },
  });
});

test("a day with nothing written has no intake: empty, not zero", () => {
  expect(intakeOf(null)).toBeNull();
  expect(intakeOf(NO_MEALS)).toBeNull();
});

test("a day of water alone is a day of zero calories, not an empty one", () => {
  const meals = withPortion(NO_MEALS, "snacks", { food: WATER, grams: 500 });
  expect(intakeOf(meals)?.kcal).toBe(0);
});

test("the plan of a day of the week adds up the same way", () => {
  const monday = withPortion(NO_MEALS, "dinner", { food: PASTA, grams: 100 });
  const plan = planWithDay(NO_PLAN, "mon", monday);
  expect(plannedIntake(plan, "mon")?.kcal).toBe(371);
  expect(plannedIntake(plan, "tue")).toBeNull();
});
