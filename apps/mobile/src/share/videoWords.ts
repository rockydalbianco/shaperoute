import type { Language } from "../i18n/languages";
import type { Character } from "./videoCharacter";
import type { LineColour, VideoEdit } from "./videoEdit";
import { type Ending, type RouteCamera, switched } from "./videoScenes";
import type { VideoStyle } from "./videoStyle";

/**
 * «Describe your video» (TASK-408, ADR-0339, part D; the user's choice 9):
 * the words the phone reads to fill «Edit video», in the app's five
 * languages, as the shapes' words are read (ADR-0036): accents, capitals
 * and apostrophes do not count, and every language's words are known
 * whatever the app's language. The words only choose among the sheet's
 * own choices — the animal, the style, the line's colour, the emoji, the
 * opening, the camera, the ending — and never make a place, a line or a
 * shape: the route stays the run's (ADR-0001). A word the table does not
 * know is skipped, with no error; no network, no AI. New words come with
 * an update of the app.
 */

type Words = Readonly<Record<Language, readonly string[]>>;

/** The animals, and «no animal». */
export const CHARACTER_WORDS: Readonly<Record<Character | "none", Words>> = {
  white_horse: {
    en: ["white horse", "white pony"],
    it: ["cavallo bianco", "cavalla bianca"],
    de: ["weisses pferd", "weißes pferd", "schimmel"],
    es: ["caballo blanco"],
    fr: ["cheval blanc"],
  },
  horse: {
    en: ["horse", "pony", "stallion"],
    it: ["cavallo", "cavalla", "puledro", "stallone"],
    de: ["pferd", "pony", "hengst"],
    es: ["caballo", "poni", "potro", "yegua"],
    fr: ["cheval", "poney", "jument", "etalon"],
  },
  elephant: {
    en: ["elephant"],
    it: ["elefante", "elefantino"],
    de: ["elefant"],
    es: ["elefante"],
    fr: ["elephant"],
  },
  stag: {
    en: ["stag"],
    it: ["cervo"],
    de: ["hirsch"],
    es: ["ciervo"],
    fr: ["cerf"],
  },
  deer: {
    en: ["deer", "roe deer", "doe"],
    it: ["capriolo", "cerbiatto", "daino"],
    de: ["reh"],
    es: ["corzo", "gamo"],
    fr: ["chevreuil", "biche"],
  },
  fox: {
    en: ["fox"],
    it: ["volpe"],
    de: ["fuchs"],
    es: ["zorro"],
    fr: ["renard"],
  },
  wolf: {
    en: ["wolf"],
    it: ["lupo"],
    de: ["wolf"],
    es: ["lobo"],
    fr: ["loup"],
  },
  husky: {
    en: ["husky", "dog"],
    it: ["husky", "cane"],
    de: ["husky", "hund"],
    es: ["husky", "perro"],
    fr: ["husky", "chien"],
  },
  shiba: {
    en: ["shiba", "shiba inu"],
    it: ["shiba", "shiba inu"],
    de: ["shiba", "shiba inu"],
    es: ["shiba", "shiba inu"],
    fr: ["shiba", "shiba inu"],
  },
  cow: {
    en: ["cow"],
    it: ["mucca", "vacca"],
    de: ["kuh"],
    es: ["vaca"],
    fr: ["vache"],
  },
  bull: {
    en: ["bull"],
    it: ["toro"],
    de: ["stier", "bulle"],
    es: ["toro"],
    fr: ["taureau"],
  },
  donkey: {
    en: ["donkey"],
    it: ["asino", "asinello", "somaro"],
    de: ["esel"],
    es: ["burro", "asno"],
    fr: ["ane"],
  },
  alpaca: {
    en: ["alpaca", "llama"],
    it: ["alpaca", "lama"],
    de: ["alpaka", "lama"],
    es: ["alpaca", "llama"],
    fr: ["alpaga", "lama"],
  },
  none: {
    en: ["no animal", "without an animal", "without animal"],
    it: ["nessun animale", "senza animale", "senza animali", "nessuno"],
    de: ["kein tier", "ohne tier"],
    es: ["ningun animal", "sin animal", "sin animales"],
    fr: ["aucun animal", "sans animal", "sans animaux"],
  },
};

export const STYLE_WORDS: Readonly<Record<VideoStyle, Words>> = {
  night: {
    en: ["night", "dark"],
    it: ["notte", "notturno", "scuro", "buio"],
    de: ["nacht", "nachts", "dunkel"],
    es: ["noche", "nocturno", "oscuro"],
    fr: ["nuit", "nocturne", "sombre"],
  },
  day: {
    en: ["day", "daylight", "light map"],
    it: ["giorno", "diurno", "di giorno"],
    de: ["tag", "tagsuber", "tagsüber"],
    es: ["dia", "de dia"],
    fr: ["jour", "de jour"],
  },
  "2d": {
    en: ["2d", "flat"],
    it: ["2d", "piatto", "piatta"],
    de: ["2d", "flach"],
    es: ["2d", "plano", "plana"],
    fr: ["2d", "plat", "plate"],
  },
  "3d": {
    en: ["3d", "hills", "mountains"],
    it: ["3d", "colline", "montagne", "rilievo"],
    de: ["3d", "hugel", "hügel", "berge"],
    es: ["3d", "colinas", "montanas", "montañas", "relieve"],
    fr: ["3d", "collines", "montagnes", "relief"],
  },
};

export const LINE_WORDS: Readonly<Record<LineColour, Words>> = {
  yellow: {
    en: ["yellow", "gold"],
    it: ["giallo", "gialla", "oro"],
    de: ["gelb", "gold"],
    es: ["amarillo", "amarilla", "dorado"],
    fr: ["jaune", "doree", "dore"],
  },
  light_blue: {
    en: ["light blue", "blue", "sky blue"],
    it: ["azzurro", "azzurra", "celeste", "blu"],
    de: ["hellblau", "blau"],
    es: ["celeste", "azul", "azul claro"],
    fr: ["bleu clair", "bleu", "bleue"],
  },
  pink: {
    en: ["pink"],
    it: ["rosa"],
    de: ["rosa", "pink"],
    es: ["rosa", "rosado"],
    fr: ["rose"],
  },
  green: {
    en: ["green"],
    it: ["verde"],
    de: ["grun", "grün"],
    es: ["verde"],
    fr: ["vert", "verte"],
  },
  white: {
    en: ["white"],
    it: ["bianco", "bianca"],
    de: ["weiss", "weiß"],
    es: ["blanco", "blanca"],
    fr: ["blanc", "blanche"],
  },
};

/** The video's emoji (`VIDEO_EMOJI`), by their names. */
export const EMOJI_WORDS: Readonly<Record<string, Words>> = {
  "🎆": {
    en: ["fireworks", "firework"],
    it: ["fuochi d'artificio", "fuoco d'artificio", "fuochi"],
    de: ["feuerwerk"],
    es: ["fuegos artificiales", "fuego artificial"],
    fr: ["feu d'artifice", "feux d'artifice"],
  },
  "⭐": {
    en: ["stars", "star"],
    it: ["stelle", "stella", "stelline"],
    de: ["sterne", "stern"],
    es: ["estrellas", "estrella"],
    fr: ["etoiles", "etoile"],
  },
  "❤️": {
    en: ["hearts", "heart", "love"],
    it: ["cuori", "cuore", "cuoricini"],
    de: ["herzen", "herz"],
    es: ["corazones", "corazon"],
    fr: ["coeurs", "coeur"],
  },
  "🔥": {
    en: ["fire", "flames"],
    it: ["fuoco", "fiamme"],
    de: ["feuer", "flammen"],
    es: ["fuego", "llamas"],
    fr: ["feu", "flammes"],
  },
  "⚡": {
    en: ["lightning", "bolts", "bolt"],
    it: ["fulmini", "fulmine", "saette"],
    de: ["blitze", "blitz"],
    es: ["rayos", "rayo"],
    fr: ["eclairs", "eclair"],
  },
  "🎉": {
    en: ["confetti", "party"],
    it: ["coriandoli", "festa"],
    de: ["konfetti", "party"],
    es: ["confeti", "fiesta"],
    fr: ["confettis", "fete"],
  },
  "🏆": {
    en: ["trophy", "cup"],
    it: ["trofeo", "coppa"],
    de: ["pokal", "trophae", "trophäe"],
    es: ["trofeo", "copa"],
    fr: ["trophee", "coupe"],
  },
};

export const CAMERA_WORDS: Readonly<Record<Exclude<RouteCamera, "line">, Words>> = {
  behind: {
    en: ["from behind", "behind", "follow", "following", "chase"],
    it: ["da dietro", "dietro", "segui", "seguire", "inseguire"],
    de: ["von hinten", "hinterher", "folgen", "folgt", "verfolgen"],
    es: ["desde atras", "detras", "sigue", "seguir", "perseguir"],
    fr: ["de derriere", "derriere", "suivre", "suit", "poursuivre"],
  },
  around: {
    en: ["around", "turning", "turn", "orbit"],
    it: ["intorno", "gira", "girare", "attorno"],
    de: ["rundherum", "herum", "dreht", "drehen"],
    es: ["alrededor", "gira", "girar"],
    fr: ["autour", "tourne", "tourner"],
  },
};

export const NO_OPENING_WORDS: Words = {
  en: ["no opening", "without an opening", "without opening"],
  it: ["senza apertura", "nessuna apertura"],
  de: ["ohne anfang", "kein anfang"],
  es: ["sin inicio", "sin apertura"],
  fr: ["sans ouverture"],
};

/** The endings; they count only where the words speak of the ending. */
export const ENDING_WORDS: Readonly<Record<Ending, Words>> = {
  numbers: {
    en: ["numbers", "stats", "results"],
    it: ["numeri", "risultati"],
    de: ["zahlen", "ergebnisse"],
    es: ["numeros", "resultados"],
    fr: ["chiffres", "resultats"],
  },
  drawing: {
    en: ["whole drawing", "drawing", "shape"],
    it: ["disegno intero", "disegno", "forma"],
    de: ["ganze zeichnung", "zeichnung", "form"],
    es: ["dibujo entero", "dibujo", "forma"],
    fr: ["dessin entier", "dessin", "forme"],
  },
  heart: {
    en: ["heart"],
    it: ["cuore"],
    de: ["herz"],
    es: ["corazon"],
    fr: ["coeur"],
  },
  all: {
    en: ["all three", "everything", "all"],
    // «tutti e tre» is read in two at its «e»: «tutti» is enough.
    it: ["tutti e tre", "tutti", "tutto"],
    de: ["alle drei", "alles"],
    es: ["los tres", "todo"],
    fr: ["les trois", "tout"],
  },
};

/** Where the words speak of the end of the video: emoji there burst at the
 * end, and an ending's words count. */
const AT_END: Words = {
  en: ["at the end", "in the end", "to finish", "finish"],
  it: ["alla fine", "in fondo", "per finire"],
  de: ["am ende", "am schluss", "zum schluss"],
  es: ["al final", "para terminar"],
  fr: ["a la fin", "pour finir"],
};

/** Where they speak of the ending itself: there «heart» is the ending's
 * heart, not the emoji. */
const ENDING_MARKS: Words = {
  en: ["ending", "end with", "ends with", "finale"],
  it: ["finale", "finisce con", "chiude con"],
  de: ["ende mit", "endet mit", "schluss mit", "abschluss"],
  es: ["final con", "termina con", "cierre"],
  fr: ["fin avec", "finit avec", "finale"],
};

/** Lower case, no accents, apostrophes and dashes as spaces, «œ» as «oe»,
 * «ß» as «ss», single spaces. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/ß/g, "ss")
    .replace(/['‘’`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function phrasesOf(words: Words): string[] {
  return Object.values(words).flat().map(normalize);
}

type Hit =
  | { kind: "character"; value: Character | null }
  | { kind: "style"; value: VideoStyle }
  | { kind: "line"; value: LineColour }
  | { kind: "emoji"; value: string }
  | { kind: "camera"; value: RouteCamera }
  | { kind: "noOpening" }
  | { kind: "ending"; value: Ending };

/** Every phrase of the table with what it chooses, longest first, so
 * «cavallo bianco» is read before «cavallo» and «bianco». */
const PHRASES: { phrase: string; hit: Hit }[] = [
  ...Object.entries(CHARACTER_WORDS).flatMap(([key, words]) =>
    phrasesOf(words).map((phrase) => ({
      phrase,
      hit: {
        kind: "character" as const,
        value: key === "none" ? null : (key as Character),
      },
    })),
  ),
  ...Object.entries(STYLE_WORDS).flatMap(([key, words]) =>
    phrasesOf(words).map((phrase) => ({
      phrase,
      hit: { kind: "style" as const, value: key as VideoStyle },
    })),
  ),
  ...Object.entries(LINE_WORDS).flatMap(([key, words]) =>
    phrasesOf(words).map((phrase) => ({
      phrase,
      hit: { kind: "line" as const, value: key as LineColour },
    })),
  ),
  ...Object.entries(EMOJI_WORDS).flatMap(([key, words]) =>
    phrasesOf(words).map((phrase) => ({
      phrase,
      hit: { kind: "emoji" as const, value: key },
    })),
  ),
  ...Object.entries(CAMERA_WORDS).flatMap(([key, words]) =>
    phrasesOf(words).map((phrase) => ({
      phrase,
      hit: { kind: "camera" as const, value: key as RouteCamera },
    })),
  ),
  ...phrasesOf(NO_OPENING_WORDS).map((phrase) => ({
    phrase,
    hit: { kind: "noOpening" as const },
  })),
  ...Object.entries(ENDING_WORDS).flatMap(([key, words]) =>
    phrasesOf(words).map((phrase) => ({
      phrase,
      hit: { kind: "ending" as const, value: key as Ending },
    })),
  ),
].sort((a, b) => b.phrase.length - a.phrase.length);

const AT_END_PHRASES = phrasesOf(AT_END);
const ENDING_PHRASES = phrasesOf(ENDING_MARKS);

/** The parts a description is read in: its clauses, split at punctuation
 * and at «and» in the five languages. */
function clausesOf(text: string): string[] {
  return text
    .split(/[,;.!?\n]+/)
    .flatMap((part) =>
      normalize(part).split(/ (?:and|e|ed|und|y|et|poi|then|dann|luego|puis) /),
    )
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function has(clause: string, phrase: string): boolean {
  return ` ${clause} `.includes(` ${phrase} `);
}

/**
 * What a description chooses in «Edit video»: only the sheet's own
 * choices, from the words the table knows; nothing for the rest.
 * «a horse at night, fireworks at the end» chooses the horse, «Night» and
 * 🎆 at the end. A camera chosen with no style chooses «3D», the one style
 * a camera turns on.
 */
export function readVideoWords(
  text: string,
): Partial<VideoEdit> & { noOpening?: true } {
  const out: Partial<VideoEdit> & { noOpening?: true } = {};
  for (const clause of clausesOf(text)) {
    const atEnd = AT_END_PHRASES.some((phrase) => has(clause, phrase));
    const ending = ENDING_PHRASES.some((phrase) => has(clause, phrase));
    let rest = ` ${clause} `;
    for (const { phrase, hit } of PHRASES) {
      if (!rest.includes(` ${phrase} `)) {
        continue;
      }
      // The heart of an ending, or the emoji; the endings only where the
      // words speak of the end.
      if (hit.kind === "ending" && !(ending || (atEnd && hit.value !== "heart"))) {
        continue;
      }
      if (hit.kind === "emoji" && ending && hit.value === "❤️") {
        continue;
      }
      rest = rest.replace(` ${phrase} `, " ".repeat(phrase.length + 2));
      switch (hit.kind) {
        case "character":
          out.character = hit.value;
          break;
        case "style":
          out.style = hit.value;
          break;
        case "line":
          out.line = hit.value;
          break;
        case "emoji":
          if (atEnd || ending) {
            out.end = hit.value;
          } else {
            out.along = hit.value;
          }
          break;
        case "camera":
          out.camera = hit.value;
          break;
        case "noOpening":
          out.noOpening = true;
          break;
        case "ending":
          out.ending = hit.value;
          break;
      }
    }
  }
  if (out.camera !== undefined && out.style === undefined) {
    out.style = "3d";
  }
  return out;
}

/** `edit` with what `text` chooses: the rest as it was. */
export function withVideoWords(edit: VideoEdit, text: string): VideoEdit {
  const { noOpening, ...chosen } = readVideoWords(text);
  return {
    ...edit,
    ...chosen,
    ...(noOpening ? { off: switched(edit.off, "opening", false) } : {}),
  };
}
