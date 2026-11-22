import {
  addOwnFood,
  changeOwnFood,
  NO_OWN_FOODS,
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
