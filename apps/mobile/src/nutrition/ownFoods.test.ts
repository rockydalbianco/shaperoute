import { barcodeOf } from "./foods";
import {
  addOwnFood,
  changeOwnFood,
  NO_OWN_FOODS,
  ownFoodByBarcode,
  type OwnFoods,
  ownFoodsFrom,
  removeOwnFood,
} from "./ownFoods";

function withTwo(): OwnFoods {
  const first = addOwnFood(NO_OWN_FOODS, { name: "Granola", kcalPer100g: 450 });
  const second = addOwnFood(first!.own, {
    name: " Protein  bar ",
    kcalPer100g: 380,
    proteinPer100g: 30,
    carbsPer100g: 35,
    fatPer100g: 12,
  });
  return second!.own;
}

test("a food of the user's has a name and the calories of 100 g", () => {
  const added = addOwnFood(NO_OWN_FOODS, { name: "Granola", kcalPer100g: 450 });
  expect(added?.food).toEqual({
    key: "own-1",
    name: "Granola",
    kcalPer100g: 450,
    proteinPer100g: null,
    carbsPer100g: null,
    fatPer100g: null,
    source: "own",
  });
  expect(added?.own).toEqual({ next: 2, foods: [added?.food] });
});

test("protein, carbohydrates and fat are kept when the user has them", () => {
  const own = withTwo();
  expect(own.foods[1]).toMatchObject({
    key: "own-2",
    name: "Protein bar",
    proteinPer100g: 30,
    carbsPer100g: 35,
    fatPer100g: 12,
  });
});

test("a food that makes no sense is not added", () => {
  expect(addOwnFood(NO_OWN_FOODS, { name: "  ", kcalPer100g: 100 })).toBeNull();
  expect(addOwnFood(NO_OWN_FOODS, { name: "Lard", kcalPer100g: 950 })).toBeNull();
  expect(addOwnFood(NO_OWN_FOODS, { name: "Ice", kcalPer100g: -5 })).toBeNull();
  expect(
    addOwnFood(NO_OWN_FOODS, { name: "Bar", kcalPer100g: 300, proteinPer100g: 120 }),
  ).toBeNull();
  expect(addOwnFood(NO_OWN_FOODS, { name: "Bar", kcalPer100g: Number.NaN })).toBeNull();
});

test("a food is rewritten under the same key", () => {
  const changed = changeOwnFood(withTwo(), "own-1", {
    name: "Granola, homemade",
    kcalPer100g: 470,
  });
  expect(changed?.food).toMatchObject({
    key: "own-1",
    name: "Granola, homemade",
    kcalPer100g: 470,
  });
  expect(changed?.own.foods.map((food) => food.key)).toEqual(["own-1", "own-2"]);
  expect(changed?.own.next).toBe(3);
});

test("a food that is not there, or a bad rewrite, changes nothing", () => {
  expect(changeOwnFood(withTwo(), "own-9", { name: "X", kcalPer100g: 1 })).toBeNull();
  expect(changeOwnFood(withTwo(), "own-1", { name: "", kcalPer100g: 1 })).toBeNull();
});

test("a key is never given twice, even after a food is removed", () => {
  const less = removeOwnFood(withTwo(), "own-2");
  expect(less.foods.map((food) => food.key)).toEqual(["own-1"]);
  const again = addOwnFood(less, { name: "Hummus", kcalPer100g: 166 });
  expect(again?.food.key).toBe("own-3");
});

test("what was kept reads back the same", () => {
  const own = withTwo();
  expect(ownFoodsFrom(JSON.parse(JSON.stringify(own)))).toEqual(own);
});

test("a file that does not read is no foods", () => {
  expect(ownFoodsFrom(null)).toEqual(NO_OWN_FOODS);
  expect(ownFoodsFrom("[]")).toEqual(NO_OWN_FOODS);
  expect(ownFoodsFrom({ foods: "none" })).toEqual(NO_OWN_FOODS);
});

test("foods that are not the user's, or twice, are left out", () => {
  const granola = { key: "own-4", name: "Granola", kcalPer100g: 450, source: "own" };
  const read = ownFoodsFrom({
    next: 2,
    foods: [
      granola,
      { ...granola, name: "Granola again" },
      { key: "usda-1", name: "Apple", kcalPer100g: 52, source: "table" },
      { key: "mine", name: "Bread", kcalPer100g: 265, source: "own" },
      { key: "own-5", name: "", kcalPer100g: 10, source: "own" },
    ],
  });
  expect(read.foods.map((food) => food.name)).toEqual(["Granola"]);
  // The counter never falls behind a key that is there.
  expect(read.next).toBe(5);
});

// A food by the barcode on its pack (part G).

test("a barcode is its digits, as long as the codes on a pack", () => {
  expect(barcodeOf("3017620422003")).toBe("3017620422003");
  expect(barcodeOf(" 3017 6204-22003 ")).toBe("3017620422003");
  expect(barcodeOf("96385074")).toBe("96385074");
  expect(barcodeOf("036000291452")).toBe("036000291452");
  for (const not of [
    "",
    "12345",
    "30176204220",
    "3017620422003x",
    "pasta",
    null,
    3017,
  ]) {
    expect(barcodeOf(not)).toBeNull();
  }
});

test("a food found by its code keeps the code and says where it comes from", () => {
  const added = addOwnFood(NO_OWN_FOODS, {
    name: "Nutella",
    kcalPer100g: 539,
    barcode: "3017 6204 22003",
    fromOpenFoodFacts: true,
  });
  expect(added?.food).toMatchObject({
    key: "own-1",
    source: "own",
    barcode: "3017620422003",
    fromOpenFoodFacts: true,
  });
  // Read back from the phone as it was.
  expect(ownFoodsFrom(JSON.parse(JSON.stringify(added?.own)))).toEqual(added?.own);
});

test("without a barcode a food is as before, and cannot be «from Open Food Facts»", () => {
  const added = addOwnFood(NO_OWN_FOODS, {
    name: "Granola",
    kcalPer100g: 450,
    barcode: "not a code",
    fromOpenFoodFacts: true,
  });
  expect(added?.food).not.toHaveProperty("barcode");
  expect(added?.food).not.toHaveProperty("fromOpenFoodFacts");
});

test("a food the user rewrites keeps its code, and its numbers are the user's", () => {
  const added = addOwnFood(NO_OWN_FOODS, {
    name: "Nutella",
    kcalPer100g: 539,
    barcode: "3017620422003",
    fromOpenFoodFacts: true,
  });
  const changed = changeOwnFood(added!.own, "own-1", {
    name: "Nutella",
    kcalPer100g: 546,
    barcode: added!.food.barcode,
  });
  expect(changed?.food.barcode).toBe("3017620422003");
  expect(changed?.food).not.toHaveProperty("fromOpenFoodFacts");
});

test("a code the phone has is found among the user's foods, the latest first", () => {
  const first = addOwnFood(NO_OWN_FOODS, {
    name: "Nutella",
    kcalPer100g: 539,
    barcode: "3017620422003",
  })!;
  const second = addOwnFood(first.own, {
    name: "Nutella, my jar",
    kcalPer100g: 546,
    barcode: "3017620422003",
  })!;
  expect(ownFoodByBarcode(second.own.foods, "3017 6204 22003")?.name).toBe(
    "Nutella, my jar",
  );
  expect(ownFoodByBarcode(second.own.foods, "96385074")).toBeNull();
  expect(ownFoodByBarcode(second.own.foods, "nutella")).toBeNull();
});
