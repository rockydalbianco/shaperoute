import { foodName } from "./foods";
import {
  perServing,
  recipePortions,
  servingsOf,
  SERVINGS,
  tableFood,
} from "./recipeMath";
import { RECIPE_GROUPS, RECIPES, recipeOf } from "./recipes";

// The numbers of a serving the user read and approved (2026-11-27), made
// by a script from the same food table: the app must give the same. One
// difference: the eggs are 412.5 kcal a serving, and the script's Python
// rounds a half to the even number (412) where the app, as in the diary,
// rounds it up (413).
const APPROVED: readonly (readonly [string, number, number, number, number])[] = [
  ["porridge-banana-walnuts", 532, 18, 79, 18],
  ["greek-yogurt-berries-granola", 456, 22, 52, 19],
  ["scrambled-eggs-wholemeal-toast", 413, 24, 30, 22],
  ["pasta-tomato", 463, 17, 74, 12],
  ["rice-salad", 487, 21, 67, 14],
  ["chicken-rice-broccoli", 526, 37, 67, 12],
  ["salmon-potatoes-green-beans", 522, 32, 45, 25],
  ["lentil-soup", 451, 22, 73, 9],
  ["courgette-frittata", 330, 23, 8, 23],
  ["couscous-chickpeas-vegetables", 564, 20, 92, 14],
  ["caprese-bread", 628, 34, 35, 39],
  ["hummus-pita-carrots", 282, 10, 40, 10],
];

test("the twelve recipes the user approved, in the order of the list", () => {
  expect(RECIPES.map((recipe) => recipe.id)).toEqual(APPROVED.map(([id]) => id));
});

test("no two recipes share an id", () => {
  const ids = RECIPES.map((recipe) => recipe.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test.each(APPROVED)(
  "«%s»: a serving is %i kcal, %i g protein, %i g carbs, %i g fat",
  (id, kcal, protein, carbs, fat) => {
    const recipe = recipeOf(id)!;
    const numbers = perServing(recipePortions(recipe), recipe.servings);
    expect(numbers).toEqual({
      kcal,
      macros: { proteinG: protein, carbsG: carbs, fatG: fat, complete: true },
    });
  },
);

test.each(RECIPES.map((recipe) => [recipe.id, recipe] as const))(
  "«%s» is made of foods of the table, with whole grams",
  (_id, recipe) => {
    expect(recipe.ingredients.length).toBeGreaterThan(0);
    for (const { key, grams } of recipe.ingredients) {
      expect(tableFood(key)).not.toBeNull();
      expect(Number.isInteger(grams)).toBe(true);
      expect(grams).toBeGreaterThan(0);
    }
    const keys = recipe.ingredients.map((ingredient) => ingredient.key);
    expect(new Set(keys).size).toBe(keys.length);
  },
);

test.each(RECIPES.map((recipe) => [recipe.id, recipe] as const))(
  "«%s» has a group, servings, times, a name and steps",
  (_id, recipe) => {
    expect(RECIPE_GROUPS).toContain(recipe.group);
    expect(servingsOf(recipe.servings)).toBe(recipe.servings);
    expect(recipe.prepMin).toBeGreaterThan(0);
    expect(recipe.cookMin).toBeGreaterThanOrEqual(0);
    expect(foodName(recipe.name)).toBe(recipe.name);
    expect(recipe.steps.length).toBeGreaterThan(0);
  },
);

test("every group has a recipe", () => {
  for (const group of RECIPE_GROUPS) {
    expect(RECIPES.some((recipe) => recipe.group === group)).toBe(true);
  }
});

test("a recipe is for no more servings than the app lets one choose", () => {
  for (const recipe of RECIPES) {
    expect(recipe.servings).toBeLessThanOrEqual(SERVINGS.max);
  }
});

test("there is no recipe with an id MuW does not have", () => {
  expect(recipeOf("lasagne")).toBeNull();
});
