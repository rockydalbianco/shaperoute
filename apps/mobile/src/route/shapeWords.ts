import { type Shape, SHAPES } from "@shaperoute/shared-types";

import { t } from "../i18n";
import type { Language } from "../i18n/languages";
import { shapeWord } from "../i18n/shapeNames";

/**
 * The words that name each shape of the catalogue (ADR-0036), in the
 * app's five languages (TASK-210 F), singular and plural, written as each
 * language writes them: accents and capitals do not count when the field
 * is read. Every language's words are known whatever the app's language.
 * Any other word is for the AI to read, later (TASK-030).
 */
export const SHAPE_WORDS: Record<
  Shape,
  Readonly<Record<Language, readonly string[]>>
> = {
  circle: {
    en: ["circle", "circles", "ring", "round"],
    de: ["Kreis", "Kreise", "Ring", "rund"],
    it: ["cerchio", "cerchi", "anello", "tondo"],
    es: ["círculo", "círculos", "anillo", "redondo", "redondel"],
    fr: ["cercle", "cercles", "anneau", "rond"],
  },
  heart: {
    en: ["heart", "hearts", "love"],
    de: ["Herz", "Herzen", "Herzchen", "Liebe"],
    it: ["cuore", "cuori", "cuoricino", "amore"],
    es: ["corazón", "corazones", "corazoncito", "amor"],
    fr: ["cœur", "cœurs", "amour"],
  },
  star: {
    en: ["star", "stars"],
    de: ["Stern", "Sterne", "Sternchen"],
    it: ["stella", "stelle", "stellina"],
    es: ["estrella", "estrellas", "estrellita"],
    fr: ["étoile", "étoiles"],
  },
  horse: {
    en: ["horse", "horses", "pony", "stallion"],
    de: ["Pferd", "Pferde", "Pony", "Ross", "Hengst", "Fohlen"],
    it: ["cavallo", "cavalli", "cavallino", "stallone", "puledro"],
    es: ["caballo", "caballos", "caballito", "poni", "potro", "semental"],
    fr: ["cheval", "chevaux", "poney", "étalon", "poulain"],
  },
  moon: {
    en: ["moon", "moons", "crescent", "crescent moon"],
    de: ["Mond", "Monde", "Halbmond", "Mondsichel"],
    it: ["luna", "lune", "mezzaluna", "falce di luna"],
    es: ["luna", "lunas", "media luna", "luna creciente"],
    fr: ["lune", "lunes", "croissant", "croissant de lune", "demi-lune"],
  },
  cat: {
    en: ["cat", "cats", "kitty", "kitten"],
    de: ["Katze", "Katzen", "Kater", "Kätzchen", "Mieze"],
    it: ["gatto", "gatti", "gatta", "gatte", "gattino", "micio"],
    es: ["gato", "gatos", "gata", "gatito", "gatita", "minino"],
    fr: ["chat", "chats", "chaton", "minou"],
  },
  fish: {
    en: ["fish", "fishes"],
    de: ["Fisch", "Fische"],
    it: ["pesce", "pesci", "pesciolino"],
    es: ["pez", "peces", "pececito"],
    fr: ["poisson", "poissons"],
  },
  butterfly: {
    en: ["butterfly", "butterflies"],
    de: ["Schmetterling", "Schmetterlinge", "Falter"],
    it: ["farfalla", "farfalle", "farfallina"],
    es: ["mariposa", "mariposas", "mariposita"],
    fr: ["papillon", "papillons"],
  },
  snail: {
    en: ["snail", "snails"],
    de: ["Schnecke", "Schnecken"],
    it: ["lumaca", "lumache", "lumachina", "chiocciola", "chiocciole"],
    es: ["caracol", "caracoles", "caracolito"],
    fr: ["escargot", "escargots"],
  },
  // Only the head is drawn, but a dog is what the runner asks for (ADR-0061).
  dog_head: {
    en: ["dog", "dogs", "dog head", "dog's head", "doggy", "puppy"],
    de: ["Hund", "Hunde", "Hündchen", "Welpe", "Hundekopf"],
    it: ["cane", "cani", "cagnolino", "testa di cane"],
    es: ["perro", "perros", "perrito", "cachorro", "cabeza de perro"],
    fr: ["chien", "chiens", "chiot", "toutou", "tête de chien"],
  },
  // The same for the rabbit: its head is the rabbit (ADR-0061).
  rabbit_head: {
    en: ["rabbit", "rabbits", "rabbit head", "rabbit's head", "bunny"],
    de: ["Hase", "Hasen", "Häschen", "Kaninchen", "Karnickel", "Hasenkopf"],
    it: ["coniglio", "conigli", "coniglietto", "testa di coniglio"],
    es: ["conejo", "conejos", "conejito", "cabeza de conejo"],
    fr: ["lapin", "lapins", "lapereau", "tête de lapin"],
  },
  pumpkin: {
    en: ["pumpkin", "pumpkins", "halloween pumpkin", "jack-o'-lantern"],
    de: ["Kürbis", "Kürbisse", "Halloweenkürbis", "Halloween-Kürbis"],
    it: ["zucca", "zucche", "zucca di halloween"],
    es: ["calabaza", "calabazas", "calabaza de Halloween"],
    fr: ["citrouille", "citrouilles", "citrouille d'Halloween"],
  },
  // Never "tree" or "albero" alone: a plain tree is another drawing, not in
  // the catalogue (ADR-0084). «Tannenbaum» and «sapin» are a fir as well.
  christmas_tree: {
    en: ["christmas tree", "christmas trees", "xmas tree"],
    de: ["Weihnachtsbaum", "Weihnachtsbäume", "Christbaum"],
    it: ["albero di natale", "alberi di natale", "alberello di natale"],
    es: ["árbol de Navidad", "árboles de Navidad", "arbolito de Navidad"],
    fr: ["sapin de Noël", "sapins de Noël", "arbre de Noël"],
  },
  // The simple shapes of TASK-223. The ring and the round are the circle's.
  smiley: {
    en: ["smiley", "smileys", "smiley face", "smiling face", "happy face", "smile"],
    de: ["Smiley", "Smileys", "Lächeln", "lachendes Gesicht"],
    it: ["faccina", "faccine", "faccina sorridente", "sorriso", "sorrisino"],
    es: [
      "carita sonriente",
      "caritas sonrientes",
      "cara sonriente",
      "carita feliz",
      "carita",
      "sonrisa",
    ],
    fr: ["smiley", "smileys", "visage souriant", "sourire"],
  },
  ghost: {
    en: ["ghost", "ghosts", "spook"],
    de: ["Gespenst", "Gespenster", "Geist", "Geister"],
    it: ["fantasma", "fantasmi", "fantasmino", "spettro"],
    es: ["fantasma", "fantasmas", "fantasmita", "espectro"],
    fr: ["fantôme", "fantômes", "spectre"],
  },
  donut: {
    en: ["donut", "donuts", "doughnut", "doughnuts"],
    de: ["Donut", "Donuts"],
    it: ["ciambella", "ciambelle", "ciambellina"],
    es: ["dónut", "dónuts", "rosquilla"],
    fr: ["donut", "donuts"],
  },
  sun: {
    en: ["sun", "suns", "sunshine"],
    de: ["Sonne", "Sonnen", "Sonnenschein"],
    it: ["sole", "solicello", "sole splendente"],
    es: ["sol", "soles", "solecito"],
    fr: ["soleil", "soleils"],
  },
};

/**
 * Lower case, no accents, «œ» as «oe», curly apostrophes made straight,
 * underscores as spaces (so the contract's "dog_head" reads too), single
 * spaces.
 */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/\s+/g, " ")
    .trim();
}

const WORD_TO_SHAPE = new Map<string, Shape>(
  SHAPES.flatMap((shape) =>
    Object.values(SHAPE_WORDS[shape])
      .flat()
      .map((word) => [normalize(word), shape] as const),
  ),
);

/** The articles before a shape, in the five languages: «ein Herz», «une étoile». */
const ARTICLES = new Set([
  "a",
  "an",
  "the",
  "der",
  "die",
  "das",
  "ein",
  "eine",
  "einen",
  "un",
  "uno",
  "una",
  "il",
  "lo",
  "la",
  "el",
  "los",
  "las",
  "le",
  "les",
  "une",
]);

/**
 * The shape a word names: "cavallo", "Una Stella", "l'amore", "Hearts",
 * «ein Herz», «l'étoile». Null for an empty or unknown word.
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
 * A shape as the runner reads it, in the app's language: "dog head" for
 * `dog_head`, «Hundekopf» in German (TASK-210 F). The contract keeps its
 * name; the table knows this one too, so it can go in the field.
 */
export function shapeName(shape: Shape): string {
  return shapeWord(shape);
}

/** "circle, heart, star, …, donut or sun": the shapes to suggest. */
export function shapeList(): string {
  const names = SHAPES.map(shapeName);
  return t("{list} or {last}", {
    list: names.slice(0, -1).join(", "),
    last: names[names.length - 1],
  });
}
