import { foodFrom } from "./foods";
import { gramsOf, type Portion } from "./plan";
import { recipePortions, servingsOf } from "./recipeMath";
import { type Recipe, recipeOf } from "./recipes";

/**
 * A recipe as the user changed it (TASK-489 part L, ADR-0397): other
 * grams, an ingredient taken out or one added from the app's foods. It is
 * kept on this phone only, with the rest of «Nutrition», and it is the
 * version that goes into the diary and the plan. «Back to MuW's recipe»
 * forgets it.
 *
 * An ingredient carries its food whole, like a portion of the plan: a food
 * of the user's changed later does not change a recipe already written.
 */
export type RecipeVersion = {
  /** How many the ingredients below are for. */
  readonly servings: number;
  readonly ingredients: readonly Portion[];
};

/** The user's versions, under each recipe's id. */
export type OwnRecipes = { readonly [id: string]: RecipeVersion };

export const NO_OWN_RECIPES: OwnRecipes = {};

/** How many ingredients a recipe holds at most. */
export const INGREDIENTS_MAX = 40;

/** MuW's own version of `recipe`. */
export function muwVersion(recipe: Recipe): RecipeVersion {
  return { servings: recipe.servings, ingredients: recipePortions(recipe) };
}

/** Whether `a` and `b` are the same foods with the same grams for the same
 * servings, in the same order. */
function sameVersion(a: RecipeVersion, b: RecipeVersion): boolean {
  return (
    a.servings === b.servings &&
    a.ingredients.length === b.ingredients.length &&
    a.ingredients.every(
      (portion, at) =>
        portion.food.key === b.ingredients[at].food.key &&
        portion.grams === b.ingredients[at].grams,
    )
  );
}

/** What of `data` is a version of a recipe; null when it does not read or
 * has no ingredient left. An ingredient that does not read is left out. */
export function versionFrom(data: unknown): RecipeVersion | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const raw = data as Record<string, unknown>;
  const servings = servingsOf(raw.servings);
  if (servings === null || !Array.isArray(raw.ingredients)) {
    return null;
  }
  const ingredients: Portion[] = [];
  for (const item of raw.ingredients.slice(0, INGREDIENTS_MAX)) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const portion = item as Record<string, unknown>;
    const food = foodFrom(portion.food);
    const grams = gramsOf(portion.grams);
    if (food !== null && grams !== null) {
      ingredients.push({ food, grams });
    }
  }
  return ingredients.length === 0 ? null : { servings, ingredients };
}

/** What of `data` are the user's versions: one of a recipe MuW no longer
 * has, or that does not read, is left out. */
export function ownRecipesFrom(data: unknown): OwnRecipes {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return NO_OWN_RECIPES;
  }
  const own: { [id: string]: RecipeVersion } = {};
  for (const [id, value] of Object.entries(data as Record<string, unknown>)) {
    const version = recipeOf(id) === null ? null : versionFrom(value);
    if (version !== null) {
      own[id] = version;
    }
  }
  return own;
}

/** `own` without the user's version of `id`: «Back to MuW's recipe». */
export function withoutOwnRecipe(own: OwnRecipes, id: string): OwnRecipes {
  if (!(id in own)) {
    return own;
  }
  const { [id]: _gone, ...rest } = own;
  return rest;
}

/** `own` with `version` as the user's recipe `id`. A version that does not
 * read, or that is MuW's own again, is not kept. */
export function withOwnRecipe(
  own: OwnRecipes,
  id: string,
  version: RecipeVersion,
): OwnRecipes {
  const recipe = recipeOf(id);
  const kept = recipe === null ? null : versionFrom(version);
  if (recipe === null || kept === null || sameVersion(kept, muwVersion(recipe))) {
    return withoutOwnRecipe(own, id);
  }
  return { ...own, [id]: kept };
}

/** The version of `recipe` the app shows and writes: the user's when there
 * is one («Changed by you»), else MuW's. */
export function recipeVersion(
  recipe: Recipe,
  own: OwnRecipes,
): { version: RecipeVersion; changed: boolean } {
  const mine = own[recipe.id];
  return mine === undefined
    ? { version: muwVersion(recipe), changed: false }
    : { version: mine, changed: true };
}
