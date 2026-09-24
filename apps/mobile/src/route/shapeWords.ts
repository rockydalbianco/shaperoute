import { type Shape, SHAPES } from "@shaperoute/shared-types";

/**
 * The words that name each shape of the catalogue (ADR-0036), in English
 * and Italian, singular and plural. Any other word is for the AI to read,
 * later (TASK-030).
 */
export const SHAPE_WORDS: Record<
  Shape,
  { en: readonly string[]; it: readonly string[] }
> = {
  circle: {
    en: ["circle", "circles", "ring", "round"],
    it: ["cerchio", "cerchi", "anello", "tondo"],
  },
  heart: {
    en: ["heart", "hearts", "love"],
    it: ["cuore", "cuori", "cuoricino", "amore"],
  },
  star: {
    en: ["star", "stars"],
    it: ["stella", "stelle", "stellina"],
  },
  horse: {
    en: ["horse", "horses", "pony", "stallion"],
    it: ["cavallo", "cavalli", "cavallino", "stallone", "puledro"],
  },
  moon: {
    en: ["moon", "moons", "crescent", "crescent moon"],
    it: ["luna", "lune", "mezzaluna", "falce di luna"],
  },
  cat: {
    en: ["cat", "cats", "kitty", "kitten"],
    it: ["gatto", "gatti", "gatta", "gatte", "gattino", "micio"],
  },
  fish: {
    en: ["fish", "fishes"],
    it: ["pesce", "pesci", "pesciolino"],
  },
};

const WORD_TO_SHAPE = new Map<string, Shape>(
  SHAPES.flatMap((shape) =>
    [...SHAPE_WORDS[shape].en, ...SHAPE_WORDS[shape].it].map(
      (word) => [word, shape] as const,
    ),
  ),
);

const ARTICLES = new Set(["a", "an", "the", "un", "uno", "una", "il", "lo", "la"]);

/** Lower case, no accents, curly apostrophes made straight, single spaces. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The shape a word names: "cavallo", "Una Stella", "l'amore", "Hearts".
 * Null for an empty or unknown word.
 */
export function toShape(text: string): Shape | null {
  const words = normalize(text)
    .replace(/^(l|un)'\s*/, "")
    .split(" ");
  if (words.length > 1 && ARTICLES.has(words[0])) {
    words.shift();
  }
  return WORD_TO_SHAPE.get(words.join(" ")) ?? null;
}

/** "circle, heart, star, horse, moon, cat or fish": the shapes to suggest. */
export function shapeList(): string {
  return `${SHAPES.slice(0, -1).join(", ")} or ${SHAPES[SHAPES.length - 1]}`;
}
