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
  butterfly: {
    en: ["butterfly", "butterflies"],
    it: ["farfalla", "farfalle", "farfallina"],
  },
  snail: {
    en: ["snail", "snails"],
    it: ["lumaca", "lumache", "lumachina", "chiocciola", "chiocciole"],
  },
  // Only the head is drawn, but a dog is what the runner asks for (ADR-0061).
  dog_head: {
    en: ["dog", "dogs", "dog head", "dog's head", "doggy", "puppy"],
    it: ["cane", "cani", "cagnolino", "testa di cane"],
  },
  // The same for the rabbit: its head is the rabbit (ADR-0061).
  rabbit_head: {
    en: ["rabbit", "rabbits", "rabbit head", "rabbit's head", "bunny"],
    it: ["coniglio", "conigli", "coniglietto", "testa di coniglio"],
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

/**
 * Lower case, no accents, curly apostrophes made straight, underscores as
 * spaces (so the contract's "dog_head" reads too), single spaces.
 */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/_/g, " ")
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

/**
 * A shape as the runner reads it: "dog head" for `dog_head`. The contract
 * keeps its name; the table knows this one too, so it can go in the field.
 */
export function shapeName(shape: Shape): string {
  return shape.replace(/_/g, " ");
}

/** "circle, heart, star, …, snail or dog head": the shapes to suggest. */
export function shapeList(): string {
  const names = SHAPES.map(shapeName);
  return `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
}
