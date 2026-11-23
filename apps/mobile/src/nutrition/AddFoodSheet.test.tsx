import { foodsFor, SEARCH_LIMIT } from "./AddFoodSheet";
import type { Food } from "./foods";
import { kcalLabel, mealTitle } from "./MealCard";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-file-system");

const GRANOLA: Food = {
  key: "own-1",
  name: "Granola",
  kcalPer100g: 450,
  proteinPer100g: null,
  carbsPer100g: null,
  fatPer100g: null,
  source: "own",
};
const NONNA: Food = { ...GRANOLA, key: "own-2", name: "Pasta della nonna" };

// The sheet itself is tried from the diary, in DiaryView.test.tsx.

test("with nothing typed the search shows the user's own foods", () => {
  expect(foodsFor("", [GRANOLA, NONNA], "en")).toEqual([GRANOLA, NONNA]);
  expect(foodsFor("   ", [], "en")).toEqual([]);
});

test("a food is looked for among the user's own and in the table", () => {
  const found = foodsFor("pasta", [GRANOLA, NONNA], "en");
  // The user's own first among the names that begin the same way.
  expect(found[0]).toBe(NONNA);
  expect(found.map((food) => food.name)).toEqual(
    expect.arrayContaining([
      "Pasta, cooked",
      "Pasta, dry",
      "Whole-wheat pasta, cooked",
    ]),
  );
  expect(found.some((food) => food.key === GRANOLA.key)).toBe(false);
});

test("the table is looked in with the names of the app's language", () => {
  expect(foodsFor("mela", [], "it")[0]).toMatchObject({
    name: "Mela",
    kcalPer100g: 52,
  });
  expect(foodsFor("mela", [], "en").map((food) => food.name)).not.toContain("Mela");
});

test("the search never shows more than its limit", () => {
  expect(foodsFor("a", [], "en").length).toBeLessThanOrEqual(SEARCH_LIMIT);
});

test("calories are whole kilocalories, the same in every language", () => {
  expect(kcalLabel(284.4)).toBe("284 kcal");
  expect(kcalLabel(0)).toBe("0 kcal");
});

test("a meal has its name", () => {
  expect(mealTitle("breakfast")).toBe("Breakfast");
  expect(mealTitle("snacks")).toBe("Snacks");
});
