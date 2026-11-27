import { RECIPE_TEXTS, recipeTextIn } from "./recipeTexts";
import { RECIPES, recipeOf } from "./recipes";

const LANGUAGES = ["de", "es", "fr", "it"] as const;

// A step names no grams: the user can change them (TASK-489 part L).
const GRAMS = /\d\s*(g|gr|grams?|grammi|gramm|gramos|grammes)\b/i;

// No word of a diet, in any of the five languages.
const DIET =
  /\b(light|healthy|diet|slim|sano|sana|dieta|dimagr|gesund|abnehmen|saludable|adelgazar|sain|maigrir|régime)\w*/i;

test.each(LANGUAGES)("every recipe has its name and steps in «%s»", (language) => {
  expect(Object.keys(RECIPE_TEXTS[language])).toEqual(RECIPES.map((r) => r.id));
});

test.each(LANGUAGES)(
  "in «%s» every recipe has as many steps as in English",
  (language) => {
    for (const recipe of RECIPES) {
      expect(RECIPE_TEXTS[language][recipe.id].steps).toHaveLength(recipe.steps.length);
    }
  },
);

test.each(["en", ...LANGUAGES] as const)(
  "in «%s» no step names the grams and no text speaks of diets",
  (language) => {
    for (const recipe of RECIPES) {
      const { name, steps } = recipeTextIn(recipe, language);
      expect(name.trim()).not.toBe("");
      for (const text of [name, ...steps]) {
        expect(text).not.toMatch(GRAMS);
        expect(text).not.toMatch(DIET);
        expect(text.trim()).toBe(text);
        expect(text).not.toBe("");
      }
    }
  },
);

test("a recipe is shown in the language asked", () => {
  const pasta = recipeOf("pasta-tomato")!;
  expect(recipeTextIn(pasta, "en").name).toBe(pasta.name);
  expect(recipeTextIn(pasta, "it").name).toBe("Pasta al pomodoro");
  expect(recipeTextIn(pasta, "it").steps).toHaveLength(pasta.steps.length);
});

test("a recipe a language does not have is shown in English", () => {
  const other = { ...recipeOf("pasta-tomato")!, id: "not-written-yet" };
  expect(recipeTextIn(other, "de")).toEqual({ name: other.name, steps: other.steps });
});
