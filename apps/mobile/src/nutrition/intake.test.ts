import type { Food } from "./foods";
import { intakeOf, macroShares, macrosOf, plannedIntake, portionsKcal } from "./intake";
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

// Protein, carbohydrates and fat (part H).

function whole(key: string, protein: number, carbs: number, fat: number): Food {
  return {
    ...food(key, 0),
    proteinPer100g: protein,
    carbsPer100g: carbs,
    fatPer100g: fat,
  };
}

const CHICKEN = whole("chicken", 31, 0, 3.6);
const RICE = whole("rice", 2.7, 28.2, 0.3);

test("the three are added up over the day and rounded once", () => {
  const meals = withPortion(
    withPortion(NO_MEALS, "lunch", { food: CHICKEN, grams: 180 }),
    "dinner",
    { food: RICE, grams: 250 },
  );
  // 55.8 + 6.75, 0 + 70.5, 6.48 + 0.75
  expect(macrosOf(meals)).toEqual({
    proteinG: 63,
    carbsG: 71,
    fatG: 7,
    complete: true,
  });
});

test("a food with its calories alone is left out, and the day says so", () => {
  const meals = withPortion(
    withPortion(NO_MEALS, "lunch", { food: CHICKEN, grams: 100 }),
    "lunch",
    { food: PASTA, grams: 80 },
  );
  expect(macrosOf(meals)).toEqual({
    proteinG: 31,
    carbsG: 0,
    fatG: 4,
    complete: false,
  });
  // One of the three missing: left out whole.
  const half: Food = { ...CHICKEN, key: "half", fatPer100g: null };
  expect(
    macrosOf(withPortion(NO_MEALS, "lunch", { food: half, grams: 100 })),
  ).toBeNull();
});

test("a day with nothing to count has no three numbers", () => {
  expect(macrosOf(null)).toBeNull();
  expect(macrosOf(NO_MEALS)).toBeNull();
  expect(
    macrosOf(withPortion(NO_MEALS, "lunch", { food: PASTA, grams: 80 })),
  ).toBeNull();
});

test("the share of the energy uses 4, 4 and 9 kilocalories a gram", () => {
  // 400, 400 and 900 of 1700.
  expect(
    macroShares({ proteinG: 100, carbsG: 100, fatG: 100, complete: true }),
  ).toEqual({ protein: 24, carbs: 24, fat: 53 });
  expect(macroShares({ proteinG: 0, carbsG: 0, fatG: 0, complete: true })).toEqual({
    protein: 0,
    carbs: 0,
    fat: 0,
  });
});
