import {
  type Food,
  foodFrom,
  foodName,
  kcalOf,
  searchFoods,
  searchText,
} from "./foods";

function food(key: string, name: string, kcalPer100g: number = 100): Food {
  return {
    key,
    name,
    kcalPer100g,
    proteinPer100g: null,
    carbsPer100g: null,
    fatPer100g: null,
    source: "table",
  };
}

test("the calories of a portion are those of 100 g, by its grams", () => {
  expect(kcalOf(food("a", "Pasta, dry", 371), 90)).toBeCloseTo(333.9, 6);
  expect(kcalOf(food("a", "Water", 0), 500)).toBe(0);
  expect(kcalOf(food("a", "Oil", 884), -10)).toBe(0);
});

test("a name is kept trimmed, with one space between words", () => {
  expect(foodName("  Greek   yogurt ")).toBe("Greek yogurt");
  expect(foodName("   ")).toBeNull();
  expect(foodName("x".repeat(61))).toBeNull();
  expect(foodName("x".repeat(60))).toBe("x".repeat(60));
  expect(foodName(12)).toBeNull();
});

test("a food reads with its key, name, calories and source", () => {
  expect(
    foodFrom({
      key: "own-1",
      name: " Granola ",
      kcalPer100g: 450,
      proteinPer100g: 10,
      carbsPer100g: 64,
      fatPer100g: 15,
      source: "own",
    }),
  ).toEqual({
    key: "own-1",
    name: "Granola",
    kcalPer100g: 450,
    proteinPer100g: 10,
    carbsPer100g: 64,
    fatPer100g: 15,
    source: "own",
  });
});

test("a nutrient that does not read is left unknown, not zero", () => {
  const read = foodFrom({
    key: "t-1",
    name: "Apple",
    kcalPer100g: 52,
    proteinPer100g: "0.3",
    carbsPer100g: 140,
    source: "table",
  });
  expect(read).toEqual(food("t-1", "Apple", 52));
});

test("a food without what it needs is not a food", () => {
  const good = { key: "t-1", name: "Apple", kcalPer100g: 52, source: "table" };
  expect(foodFrom(good)).not.toBeNull();
  expect(foodFrom({ ...good, key: "" })).toBeNull();
  expect(foodFrom({ ...good, name: " " })).toBeNull();
  expect(foodFrom({ ...good, kcalPer100g: 901 })).toBeNull();
  expect(foodFrom({ ...good, kcalPer100g: -1 })).toBeNull();
  expect(foodFrom({ ...good, kcalPer100g: Number.NaN })).toBeNull();
  expect(foodFrom({ ...good, source: "ai" })).toBeNull();
  expect(foodFrom(null)).toBeNull();
  expect(foodFrom("Apple")).toBeNull();
});

test("a search reads past capitals, accents and spaces", () => {
  expect(searchText("  Caffè   Latte ")).toBe("caffe latte");
});

const TABLE: Food[] = [
  food("1", "Rice, white, cooked"),
  food("2", "Brown rice, cooked"),
  food("3", "Licorice"),
  food("4", "Rice cakes"),
  food("5", "Crème fraîche"),
];

test("names that begin with the query come first, then words, then the rest", () => {
  expect(searchFoods(TABLE, "rice").map((found) => found.key)).toEqual([
    "1",
    "4",
    "2",
    "3",
  ]);
});

test("every word of the query must be in the name", () => {
  expect(searchFoods(TABLE, "rice cooked").map((found) => found.key)).toEqual([
    "1",
    "2",
  ]);
  expect(searchFoods(TABLE, "rice raw")).toEqual([]);
});

test("accents and capitals do not matter", () => {
  expect(searchFoods(TABLE, "CREME fraiche").map((found) => found.key)).toEqual(["5"]);
});

test("an empty query finds nothing, and the limit holds", () => {
  expect(searchFoods(TABLE, "  ")).toEqual([]);
  expect(searchFoods(TABLE, "rice", 2).map((found) => found.key)).toEqual(["1", "4"]);
  expect(searchFoods(TABLE, "rice", 0)).toEqual([]);
});
