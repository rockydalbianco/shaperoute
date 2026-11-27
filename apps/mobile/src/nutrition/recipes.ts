/**
 * The recipes of MuW (TASK-489 part L, ADR-0397): twelve home dishes
 * written by MuW, not by a chef (the user's choice, «Sì, le scrive MuW»).
 * A recipe is foods of the app's table with their grams, for all its
 * servings, and the steps to make it: no number of calories is written
 * here. The app counts them from the table, as it counts a day of the
 * diary (recipeMath.ts), and they change when the user changes the grams.
 *
 * Salt, herbs and spices are only in the steps and are not counted; the
 * steps never name the grams, because the recipe can be changed. The name
 * and steps here are in English, the app's text; the other languages are
 * in recipeTexts/.
 */

/** The groups of the list, in the order they are shown. */
export const RECIPE_GROUPS = ["breakfast", "main", "snacks"] as const;

export type RecipeGroup = (typeof RECIPE_GROUPS)[number];

/** So many grams of a food of the table, by its key (foodTable.ts). */
export type RecipeIngredient = {
  readonly key: string;
  /** Whole grams, for all the servings of the recipe. */
  readonly grams: number;
};

export type Recipe = {
  /** Its name among the recipes, kept with the user's version of it. */
  readonly id: string;
  readonly group: RecipeGroup;
  /** How many the ingredients are for. */
  readonly servings: number;
  /** Minutes of preparation and of cooking; 0 for a dish not cooked. */
  readonly prepMin: number;
  readonly cookMin: number;
  readonly ingredients: readonly RecipeIngredient[];
  readonly name: string;
  readonly steps: readonly string[];
};

export const RECIPES: readonly Recipe[] = [
  {
    id: "porridge-banana-walnuts",
    group: "breakfast",
    servings: 1,
    prepMin: 2,
    cookMin: 8,
    ingredients: [
      { key: "usda-173904", grams: 50 }, // Rolled oats
      { key: "usda-171267", grams: 250 }, // Milk, semi-skimmed
      { key: "usda-173944", grams: 100 }, // Banana
      { key: "usda-170187", grams: 15 }, // Walnuts
      { key: "usda-169640", grams: 10 }, // Honey
    ],
    name: "Porridge with banana and walnuts",
    steps: [
      "Put the oats and the milk in a small pan with a pinch of salt.",
      "Bring to a gentle boil and cook over low heat, stirring, until the porridge is creamy.",
      "Pour into a bowl and top with the sliced banana, the chopped walnuts and the honey.",
    ],
  },
  {
    id: "greek-yogurt-berries-granola",
    group: "breakfast",
    servings: 1,
    prepMin: 5,
    cookMin: 0,
    ingredients: [
      { key: "usda-171304", grams: 170 }, // Greek yogurt, whole
      { key: "usda-171711", grams: 60 }, // Blueberries
      { key: "usda-167755", grams: 60 }, // Raspberries
      { key: "usda-171646", grams: 40 }, // Granola
      { key: "usda-169640", grams: 10 }, // Honey
    ],
    name: "Greek yogurt with berries and granola",
    steps: [
      "Put the yogurt in a bowl.",
      "Wash and dry the berries and arrange them on the yogurt.",
      "Add the granola at the last moment, so that it stays crunchy, and finish with a drizzle of honey.",
    ],
  },
  {
    id: "scrambled-eggs-wholemeal-toast",
    group: "breakfast",
    servings: 1,
    prepMin: 3,
    cookMin: 5,
    ingredients: [
      { key: "usda-171287", grams: 120 }, // Egg
      { key: "usda-173430", grams: 10 }, // Butter
      { key: "usda-172688", grams: 60 }, // Bread, whole-wheat
      { key: "usda-170457", grams: 100 }, // Tomato
    ],
    name: "Scrambled eggs on wholemeal toast",
    steps: [
      "Beat the eggs in a bowl with a pinch of salt.",
      "Melt the butter in a pan over low heat, pour in the eggs and stir gently until creamy: take them off the heat before they dry out.",
      "Toast the bread, put the eggs on it with a grind of pepper and serve with the sliced tomato.",
    ],
  },
  {
    id: "pasta-tomato",
    group: "main",
    servings: 2,
    prepMin: 5,
    cookMin: 15,
    ingredients: [
      { key: "usda-169736", grams: 160 }, // Pasta, dry
      { key: "usda-170460", grams: 300 }, // Tomato puree
      { key: "usda-171413", grams: 15 }, // Olive oil
      { key: "usda-170848", grams: 20 }, // Parmesan
      { key: "usda-169230", grams: 5 }, // Garlic
    ],
    name: "Pasta with tomato sauce",
    steps: [
      "Warm the oil in a pan with the crushed garlic over low heat for a minute.",
      "Add the tomato passata and a pinch of salt. Let it simmer for about ten minutes.",
      "Meanwhile cook the pasta in salted boiling water and drain it al dente, keeping a little of the cooking water.",
      "Take out the garlic, toss the pasta in the sauce with a spoonful of its water and serve with the Parmesan and a few basil leaves.",
    ],
  },
  {
    id: "rice-salad",
    group: "main",
    servings: 2,
    prepMin: 15,
    cookMin: 15,
    ingredients: [
      { key: "usda-168877", grams: 140 }, // Rice, white, raw
      { key: "usda-173709", grams: 100 }, // Tuna, canned in water
      { key: "usda-170420", grams: 80 }, // Peas, cooked
      { key: "usda-169214", grams: 60 }, // Sweet corn, canned
      { key: "usda-173424", grams: 60 }, // Egg, hard-boiled
      { key: "usda-169096", grams: 30 }, // Olives, green
      { key: "usda-171413", grams: 15 }, // Olive oil
    ],
    name: "Rice salad",
    steps: [
      "Cook the rice in salted boiling water, drain it al dente and rinse it under cold water to stop the cooking.",
      "Drain the tuna and the sweetcorn. Cut the boiled egg into wedges and slice the olives.",
      "Mix everything in a bowl with the peas, the oil and a pinch of salt.",
      "Leave it in the fridge for at least half an hour before serving.",
    ],
  },
  {
    id: "chicken-rice-broccoli",
    group: "main",
    servings: 2,
    prepMin: 10,
    cookMin: 20,
    ingredients: [
      { key: "usda-171077", grams: 250 }, // Chicken breast, raw
      { key: "usda-168877", grams: 140 }, // Rice, white, raw
      { key: "usda-170379", grams: 300 }, // Broccoli
      { key: "usda-171413", grams: 15 }, // Olive oil
      { key: "usda-167746", grams: 20 }, // Lemon
    ],
    name: "Chicken with rice and broccoli",
    steps: [
      "Cook the rice in salted boiling water and drain it.",
      "Cut the broccoli into florets and steam or boil them for five or six minutes: they should stay green and firm.",
      "Cut the chicken into strips, salt it and cook it in a pan with half the oil over high heat, until golden outside and cooked through.",
      "Put rice, broccoli and chicken on the plate. Dress with the rest of the oil and the lemon juice.",
    ],
  },
  {
    id: "salmon-potatoes-green-beans",
    group: "main",
    servings: 2,
    prepMin: 10,
    cookMin: 25,
    ingredients: [
      { key: "usda-175167", grams: 250 }, // Salmon, raw
      { key: "usda-170026", grams: 400 }, // Potato
      { key: "usda-169961", grams: 250 }, // Green beans
      { key: "usda-171413", grams: 15 }, // Olive oil
      { key: "usda-167746", grams: 20 }, // Lemon
    ],
    name: "Salmon with potatoes and green beans",
    steps: [
      "Peel the potatoes, cut them into pieces and boil them in salted water for about fifteen minutes. For the last six or seven minutes add the trimmed green beans.",
      "Meanwhile salt the salmon and cook it in a non-stick pan, skin side first, three or four minutes a side.",
      "Drain the potatoes and green beans and dress them with the oil.",
      "Serve the salmon with the vegetables and the lemon juice.",
    ],
  },
  {
    id: "lentil-soup",
    group: "main",
    servings: 2,
    prepMin: 10,
    cookMin: 30,
    ingredients: [
      { key: "usda-172420", grams: 140 }, // Lentils, raw
      { key: "usda-170393", grams: 80 }, // Carrot
      { key: "usda-169988", grams: 50 }, // Celery
      { key: "usda-170000", grams: 60 }, // Onion
      { key: "usda-170460", grams: 150 }, // Tomato puree
      { key: "usda-171413", grams: 15 }, // Olive oil
      { key: "usda-174913", grams: 60 }, // Bread, Italian
    ],
    name: "Lentil soup",
    steps: [
      "Chop the onion, carrot and celery and soften them in the oil in a pot over low heat for five minutes.",
      "Add the rinsed lentils (small ones need no soaking), the tomato passata and enough water to cover them by two fingers.",
      "Cook with the lid on for about twenty-five minutes, until the lentils are tender. Add hot water if needed and salt only at the end.",
      "Serve with the toasted bread and, if you like, rosemary or bay leaf.",
    ],
  },
  {
    id: "courgette-frittata",
    group: "main",
    servings: 2,
    prepMin: 10,
    cookMin: 15,
    ingredients: [
      { key: "usda-171287", grams: 240 }, // Egg
      { key: "usda-169291", grams: 300 }, // Zucchini
      { key: "usda-170000", grams: 40 }, // Onion
      { key: "usda-170848", grams: 30 }, // Parmesan
      { key: "usda-171413", grams: 15 }, // Olive oil
    ],
    name: "Courgette frittata",
    steps: [
      "Slice the courgettes thinly and the onion finely. Cook them in a pan with the oil for eight to ten minutes, until soft, and salt them.",
      "Beat the eggs with the Parmesan, a pinch of salt and pepper.",
      "Pour the eggs over the courgettes, lower the heat, cover and cook for five minutes.",
      "Turn the frittata over with the help of a plate and cook for two or three more minutes.",
    ],
  },
  {
    id: "couscous-chickpeas-vegetables",
    group: "main",
    servings: 2,
    prepMin: 10,
    cookMin: 10,
    ingredients: [
      { key: "usda-169699", grams: 140 }, // Couscous, dry
      { key: "usda-173757", grams: 200 }, // Chickpeas, cooked
      { key: "usda-169291", grams: 150 }, // Zucchini
      { key: "usda-170108", grams: 150 }, // Bell pepper, red
      { key: "usda-170393", grams: 80 }, // Carrot
      { key: "usda-171413", grams: 20 }, // Olive oil
    ],
    name: "Couscous with chickpeas and vegetables",
    steps: [
      "Dice the courgettes, pepper and carrot and sauté them in a pan with half the oil for about eight minutes: they should stay crisp. Salt them.",
      "Add the drained chickpeas and heat for two minutes.",
      "Pour the same volume of salted boiling water over the couscous, cover and leave it to swell for five minutes. Then fluff it with a fork and the rest of the oil.",
      "Mix the vegetables and chickpeas into the couscous. Mint or parsley to taste.",
    ],
  },
  {
    id: "caprese-bread",
    group: "main",
    servings: 2,
    prepMin: 10,
    cookMin: 0,
    ingredients: [
      { key: "usda-170845", grams: 250 }, // Mozzarella
      { key: "usda-170457", grams: 400 }, // Tomato
      { key: "usda-171413", grams: 20 }, // Olive oil
      { key: "usda-174913", grams: 100 }, // Bread, Italian
    ],
    name: "Caprese with bread",
    steps: [
      "Slice the tomatoes and the mozzarella to the same thickness.",
      "Alternate them on a plate.",
      "Dress with the oil, a pinch of salt and basil leaves.",
      "Serve with the bread.",
    ],
  },
  {
    id: "hummus-pita-carrots",
    group: "snacks",
    servings: 4,
    prepMin: 10,
    cookMin: 0,
    ingredients: [
      { key: "usda-173757", grams: 240 }, // Chickpeas, cooked
      { key: "usda-170189", grams: 30 }, // Tahini
      { key: "usda-171413", grams: 15 }, // Olive oil
      { key: "usda-167746", grams: 30 }, // Lemon
      { key: "usda-169230", grams: 3 }, // Garlic
      { key: "usda-174915", grams: 120 }, // Pita bread
      { key: "usda-170393", grams: 200 }, // Carrot
    ],
    name: "Hummus with pita bread and carrots",
    steps: [
      "Blend the drained chickpeas with the tahini, the lemon juice, the garlic, a pinch of salt and two or three spoonfuls of water, until smooth.",
      "Taste and adjust the salt and lemon.",
      "Pour into a bowl and finish with the oil and, if you like, paprika or cumin.",
      "Cut the carrots into sticks and the pita into wedges, and serve them with the hummus.",
    ],
  },
];

/** The recipe with `id`; null when there is none. */
export function recipeOf(id: string): Recipe | null {
  return RECIPES.find((recipe) => recipe.id === id) ?? null;
}
