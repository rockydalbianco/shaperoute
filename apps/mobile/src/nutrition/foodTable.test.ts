import { foodFrom, foodName, searchFoods, searchText } from "./foods";
import { FOOD_TABLE, FOOD_TABLE_SOURCE, tableKey } from "./foodTable";

function food(name: string) {
  const found = FOOD_TABLE.find((item) => item.name === name);
  if (found === undefined) {
    throw new Error(`${name} is not in the table`);
  }
  return found;
}

test("the table says where its numbers come from", () => {
  expect(FOOD_TABLE_SOURCE).toEqual({
    name: "USDA FoodData Central, SR Legacy",
    release: "2018-04",
    downloaded: "2026-11-23",
    licence: "CC0 1.0",
    url: "https://fdc.nal.usda.gov",
  });
});

test("the table has about three hundred foods", () => {
  expect(FOOD_TABLE.length).toBeGreaterThanOrEqual(300);
  expect(FOOD_TABLE.length).toBeLessThanOrEqual(400);
});

test("every food is under USDA's own number, once", () => {
  const keys = FOOD_TABLE.map((item) => item.key);
  for (const key of keys) {
    expect(key).toMatch(/^usda-[1-9]\d*$/);
  }
  expect(new Set(keys).size).toBe(keys.length);
  expect(tableKey(171688)).toBe("usda-171688");
});

test("no two foods have the same name", () => {
  const names = FOOD_TABLE.map((item) => searchText(item.name));
  expect(new Set(names).size).toBe(names.length);
});

test("every food reads back as the app keeps a food", () => {
  for (const item of FOOD_TABLE) {
    expect(item.source).toBe("table");
    expect(foodName(item.name)).toBe(item.name);
    expect(foodFrom(JSON.parse(JSON.stringify(item)))).toEqual(item);
  }
});

test("calories are whole, protein, carbohydrate and fat to a tenth", () => {
  for (const item of FOOD_TABLE) {
    expect(Number.isInteger(item.kcalPer100g)).toBe(true);
    for (const grams of [item.proteinPer100g, item.carbsPer100g, item.fatPer100g]) {
      if (grams !== null) {
        expect(Math.abs(grams * 10 - Math.round(grams * 10))).toBeLessThan(1e-6);
      }
    }
  }
});

test("the numbers are USDA's for 100 g", () => {
  expect(food("Apple")).toMatchObject({
    key: "usda-171688",
    kcalPer100g: 52,
    proteinPer100g: 0.3,
    carbsPer100g: 13.8,
    fatPer100g: 0.2,
  });
  expect(food("Olive oil")).toMatchObject({
    kcalPer100g: 884,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 100,
  });
  expect(food("Sugar")).toMatchObject({ kcalPer100g: 387, carbsPer100g: 100 });
  expect(food("Banana").kcalPer100g).toBe(89);
});

test("cooked and raw are different foods, with their own numbers", () => {
  expect(food("Pasta, dry").kcalPer100g).toBeGreaterThan(
    2 * food("Pasta, cooked").kcalPer100g,
  );
  expect(food("Rice, white, raw").kcalPer100g).toBeGreaterThan(
    2 * food("Rice, white, cooked").kcalPer100g,
  );
});

// 4 kcal a gram of protein and of carbohydrate, 9 of fat: USDA counts each
// food with its own factors and takes the fibre out, so a food can hold
// less than this, and only a little more. Alcohol is the one thing that
// adds calories outside the three.
test("no food holds more calories than its protein, carbohydrate and fat", () => {
  const withAlcohol = ["Beer", "Red wine", "White wine", "Spirits, 40%"];
  for (const item of FOOD_TABLE) {
    if (withAlcohol.includes(item.name)) {
      continue;
    }
    const most =
      4 * (item.proteinPer100g ?? 0) +
      4 * (item.carbsPer100g ?? 0) +
      9 * (item.fatPer100g ?? 0);
    expect(item.kcalPer100g).toBeLessThanOrEqual(most + 20);
  }
});

test("the search finds a food of the table", () => {
  expect(searchFoods(FOOD_TABLE, "apple")[0].name).toBe("Apple");
  expect(searchFoods(FOOD_TABLE, "rice cooked").map((item) => item.name)).toEqual([
    "Rice, white, cooked",
    "Rice, brown, cooked",
  ]);
});
