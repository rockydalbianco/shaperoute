import type { Language } from "../i18n/languages";
import type { Recipe } from "./recipes";
import { DE } from "./recipeTexts/de";
import { ES } from "./recipeTexts/es";
import { FR } from "./recipeTexts/fr";
import { IT } from "./recipeTexts/it";

/**
 * The recipes in the app's languages (TASK-489 part L, ADR-0397). English
 * is in recipes.ts; the other four are written by MuW, a file each in
 * recipeTexts/ and not in i18n/, like the names of the foods (foodNames/):
 * they change with the recipes, not with the screens.
 */

/** The name and steps of a recipe in one language. */
export type RecipeText = {
  readonly name: string;
  readonly steps: readonly string[];
};

/** The texts of a language, under each recipe's id. */
export type RecipeTexts = { readonly [id: string]: RecipeText };

export const RECIPE_TEXTS: { readonly [L in Exclude<Language, "en">]: RecipeTexts } = {
  de: DE,
  es: ES,
  fr: FR,
  it: IT,
};

/** The name and steps of `recipe` in `language`; English when a language
 * does not have it. */
export function recipeTextIn(recipe: Recipe, language: Language): RecipeText {
  if (language !== "en") {
    const text = RECIPE_TEXTS[language][recipe.id];
    if (text !== undefined) {
      return text;
    }
  }
  return { name: recipe.name, steps: recipe.steps };
}
