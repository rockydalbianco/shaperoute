import type { Food } from "./foods";
import type { Portion } from "./plan";
import {
  oneServing,
  perServing,
  recipePortions,
  scaledPortions,
  servingsOf,
  tableFood,
} from "./recipeMath";
import { recipeOf } from "./recipes";

const PASTA: Food = {
  key: "t-pasta",
  name: "Pasta",
  kcalPer100g: 371,
  proteinPer100g: 13,
  carbsPer100g: 75,
  fatPer100g: 1.5,
  source: "table",
};
const SAUCE: Food = {
  key: "own-1",
  name: "Grandma's sauce",
  kcalPer100g: 80,
  proteinPer100g: null,
  carbsPer100g: null,
  fatPer100g: null,
  source: "own",
};

test("a serving is the whole recipe divided by its servings, rounded at the end", () => {
  const portions: Portion[] = [{ food: PASTA, grams: 160 }];
  // 593.6 kcal, 20.8 g protein, 120 g carbs, 2.4 g fat, for two.
  expect(perServing(portions, 2)).toEqual({
    kcal: 297,
    macros: { proteinG: 10, carbsG: 60, fatG: 1, complete: true },
  });
});

test("a food with its calories alone counts in the calories, not in the three", () => {
  const portions: Portion[] = [
    { food: PASTA, grams: 100 },
    { food: SAUCE, grams: 100 },
  ];
  expect(perServing(portions, 1)).toEqual({
    kcal: 451,
    macros: { proteinG: 13, carbsG: 75, fatG: 2, complete: false },
  });
  expect(perServing([{ food: SAUCE, grams: 200 }], 2)).toEqual({
    kcal: 80,
    macros: null,
  });
});

test("a recipe with no ingredient has no numbers", () => {
  expect(perServing([], 2)).toBeNull();
});

test("the servings are whole, from one to twelve", () => {
  expect(servingsOf(1)).toBe(1);
  expect(servingsOf(12)).toBe(12);
  expect(servingsOf(0)).toBeNull();
  expect(servingsOf(13)).toBeNull();
  expect(servingsOf(2.5)).toBeNull();
  expect(servingsOf("2")).toBeNull();
});

test("more servings take more grams, whole and never under a gram", () => {
  const portions: Portion[] = [
    { food: PASTA, grams: 160 },
    { food: SAUCE, grams: 1 },
  ];
  expect(scaledPortions(portions, 2, 3).map((p) => p.grams)).toEqual([240, 2]);
  expect(scaledPortions(portions, 2, 1).map((p) => p.grams)).toEqual([80, 1]);
  expect(scaledPortions(portions, 2, 2)).toBe(portions);
});

test("one serving of a recipe for four is a quarter of each ingredient", () => {
  const hummus = recipeOf("hummus-pita-carrots")!;
  const portions = recipePortions(hummus);
  const one = oneServing(portions, hummus.servings);
  expect(one.map((p) => p.food.key)).toEqual(portions.map((p) => p.food.key));
  one.forEach((portion, at) => {
    expect(portion.grams).toBe(Math.max(1, Math.round(portions[at].grams / 4)));
  });
});

test("the foods of a recipe are the table's own", () => {
  const pasta = recipeOf("pasta-tomato")!;
  for (const portion of recipePortions(pasta)) {
    expect(portion.food).toBe(tableFood(portion.food.key));
    expect(portion.food.source).toBe("table");
  }
});

test("a key the table no longer has is left out", () => {
  const pasta = recipeOf("pasta-tomato")!;
  const gone = {
    ...pasta,
    ingredients: [...pasta.ingredients, { key: "usda-0", grams: 10 }],
  };
  expect(recipePortions(gone)).toEqual(recipePortions(pasta));
  expect(tableFood("usda-0")).toBeNull();
});
