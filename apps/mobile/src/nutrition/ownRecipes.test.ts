import type { Food } from "./foods";
import {
  INGREDIENTS_MAX,
  muwVersion,
  NO_OWN_RECIPES,
  ownRecipesFrom,
  recipeVersion,
  versionFrom,
  withOwnRecipe,
  withoutOwnRecipe,
} from "./ownRecipes";
import { recipeOf } from "./recipes";

const PASTA = recipeOf("pasta-tomato")!;

const SAUCE: Food = {
  key: "own-3",
  name: "Grandma's sauce",
  kcalPer100g: 80,
  proteinPer100g: null,
  carbsPer100g: null,
  fatPer100g: null,
  source: "own",
};

/** MuW's pasta with the grams of its first ingredient changed. */
function lessPasta() {
  const muw = muwVersion(PASTA);
  return {
    ...muw,
    ingredients: muw.ingredients.map((portion, at) =>
      at === 0 ? { ...portion, grams: portion.grams - 40 } : portion,
    ),
  };
}

test("with no change, a recipe is MuW's", () => {
  expect(recipeVersion(PASTA, NO_OWN_RECIPES)).toEqual({
    version: muwVersion(PASTA),
    changed: false,
  });
});

test("a changed recipe is the user's, and «Back to MuW's recipe» forgets it", () => {
  const own = withOwnRecipe(NO_OWN_RECIPES, PASTA.id, lessPasta());
  expect(recipeVersion(PASTA, own)).toEqual({ version: lessPasta(), changed: true });
  expect(withoutOwnRecipe(own, PASTA.id)).toEqual(NO_OWN_RECIPES);
});

test("an ingredient of the user's own foods can be added", () => {
  const muw = muwVersion(PASTA);
  const version = {
    ...muw,
    ingredients: [...muw.ingredients, { food: SAUCE, grams: 120 }],
  };
  const own = withOwnRecipe(NO_OWN_RECIPES, PASTA.id, version);
  expect(own[PASTA.id].ingredients.at(-1)).toEqual({ food: SAUCE, grams: 120 });
});

test("a recipe changed back to MuW's grams is MuW's again", () => {
  const own = withOwnRecipe(NO_OWN_RECIPES, PASTA.id, lessPasta());
  expect(withOwnRecipe(own, PASTA.id, muwVersion(PASTA))).toEqual(NO_OWN_RECIPES);
});

test("a recipe with no ingredient, or of a recipe MuW has not, is not kept", () => {
  const empty = { servings: 2, ingredients: [] };
  expect(withOwnRecipe(NO_OWN_RECIPES, PASTA.id, empty)).toEqual(NO_OWN_RECIPES);
  expect(withOwnRecipe(NO_OWN_RECIPES, "lasagne", lessPasta())).toEqual(NO_OWN_RECIPES);
});

test("what is read back is only what reads", () => {
  const good = lessPasta();
  const kept = ownRecipesFrom(JSON.parse(JSON.stringify({ [PASTA.id]: good })));
  expect(kept).toEqual({ [PASTA.id]: good });
  expect(ownRecipesFrom({ lasagne: good })).toEqual(NO_OWN_RECIPES);
  expect(ownRecipesFrom({ [PASTA.id]: { servings: 0, ingredients: [] } })).toEqual(
    NO_OWN_RECIPES,
  );
  expect(ownRecipesFrom([good])).toEqual(NO_OWN_RECIPES);
  expect(ownRecipesFrom(null)).toEqual(NO_OWN_RECIPES);
});

test("an ingredient that does not read is left out, the rest is kept", () => {
  const good = lessPasta();
  const read = versionFrom({
    servings: 2,
    ingredients: [good.ingredients[0], { food: SAUCE, grams: 0 }, { food: "x" }, 7],
  });
  expect(read).toEqual({ servings: 2, ingredients: [good.ingredients[0]] });
});

test("a recipe keeps no more ingredients than it can hold", () => {
  const many = Array.from({ length: INGREDIENTS_MAX + 5 }, () => ({
    food: SAUCE,
    grams: 10,
  }));
  expect(versionFrom({ servings: 1, ingredients: many })?.ingredients).toHaveLength(
    INGREDIENTS_MAX,
  );
});
