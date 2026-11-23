import { FOOD_NAMES, foodNameIn, foodTableIn } from "./foodNames";
import { type Food, foodName, searchFoods, searchText } from "./foods";
import { FOOD_TABLE } from "./foodTable";

const LANGUAGES = ["de", "es", "fr", "it"] as const;

const APPLE = FOOD_TABLE.find((food) => food.name === "Apple")!;

test.each(LANGUAGES)("every food of the table has its name in «%s»", (language) => {
  expect(Object.keys(FOOD_NAMES[language])).toEqual(FOOD_TABLE.map((food) => food.key));
});

test.each(LANGUAGES)("a name in «%s» is one the app keeps", (language) => {
  for (const name of Object.values(FOOD_NAMES[language])) {
    expect(foodName(name)).toBe(name);
  }
});

test.each(LANGUAGES)("no two foods have the same name in «%s»", (language) => {
  const names = Object.values(FOOD_NAMES[language]).map(searchText);
  expect(new Set(names).size).toBe(names.length);
});

test("a food of the table is named in the language asked", () => {
  expect(foodNameIn(APPLE, "en")).toBe("Apple");
  expect(foodNameIn(APPLE, "it")).toBe("Mela");
  expect(foodNameIn(APPLE, "de")).toBe("Apfel");
  expect(foodNameIn(APPLE, "es")).toBe("Manzana");
  expect(foodNameIn(APPLE, "fr")).toBe("Pomme");
});

test("a food of the user's keeps the name they wrote", () => {
  const own: Food = { ...APPLE, key: "own-1", name: "Granola", source: "own" };
  expect(foodNameIn(own, "it")).toBe("Granola");
  // Even one that took the key of a food of the table.
  expect(foodNameIn({ ...own, key: APPLE.key }, "it")).toBe("Granola");
});

test("a food the table no longer has keeps the name it was written with", () => {
  const gone: Food = { ...APPLE, key: "usda-1", name: "Quince" };
  expect(foodNameIn(gone, "fr")).toBe("Quince");
});

test("the table in English is the table itself", () => {
  expect(foodTableIn("en")).toBe(FOOD_TABLE);
});

test.each(LANGUAGES)("the table in «%s» changes the names only", (language) => {
  const table = foodTableIn(language);
  expect(table).toHaveLength(FOOD_TABLE.length);
  table.forEach((food, index) => {
    expect(food).toEqual({
      ...FOOD_TABLE[index],
      name: FOOD_NAMES[language][food.key],
    });
  });
  // Built once: the search does not make three hundred foods at every letter.
  expect(foodTableIn(language)).toBe(table);
});

test("a food is found by its name in the language of the app", () => {
  expect(searchFoods(foodTableIn("it"), "mela")[0]).toMatchObject({
    key: APPLE.key,
    name: "Mela",
    kcalPer100g: APPLE.kcalPer100g,
  });
  expect(searchFoods(foodTableIn("de"), "apfel")[0].key).toBe(APPLE.key);
  expect(searchFoods(foodTableIn("fr"), "pates cuites")[0].name).toBe("Pâtes, cuites");
  expect(searchFoods(foodTableIn("es"), "platano")[0].name).toBe("Plátano");
});
