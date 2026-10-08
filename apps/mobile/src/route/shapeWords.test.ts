import { SHAPES } from "@shaperoute/shared-types";

import { SHAPE_WORDS, shapeList, shapeName, toShape } from "./shapeWords";

test.each([
  ["heart", "heart"],
  ["cuore", "heart"],
  ["cuori", "heart"],
  ["l'amore", "heart"],
  ["l’amore", "heart"],
  ["cerchio", "circle"],
  ["un cerchio", "circle"],
  ["Stella", "star"],
  ["  una   STELLA ", "star"],
  ["stars", "star"],
  ["a star", "star"],
  ["cavallo", "horse"],
  ["il cavallo", "horse"],
  ["Cavallì", "horse"],
  ["the horse", "horse"],
  ["pony", "horse"],
  ["la luna", "moon"],
  ["Mezzaluna", "moon"],
  ["a crescent moon", "moon"],
  ["il gatto", "cat"],
  ["micio", "cat"],
  ["a kitten", "cat"],
  ["pesci", "fish"],
  ["the fish", "fish"],
  ["una farfalla", "butterfly"],
  ["Butterflies", "butterfly"],
  ["la lumaca", "snail"],
  ["chiocciola", "snail"],
  ["a snail", "snail"],
  ["il cane", "dog_head"],
  ["Cagnolino", "dog_head"],
  ["the dog", "dog_head"],
  ["dog head", "dog_head"],
  ["dog’s head", "dog_head"],
  ["testa di cane", "dog_head"],
  ["dog_head", "dog_head"],
  ["il coniglio", "rabbit_head"],
  ["a bunny", "rabbit_head"],
  ["Coniglietto", "rabbit_head"],
  ["rabbit head", "rabbit_head"],
  ["zucca", "pumpkin"],
  ["la zucca di Halloween", "pumpkin"],
  ["Pumpkins", "pumpkin"],
  ["jack-o’-lantern", "pumpkin"],
  ["albero di Natale", "christmas_tree"],
  ["l'albero di natale", "christmas_tree"],
  ["a Christmas tree", "christmas_tree"],
  ["christmas_tree", "christmas_tree"],
  ["una faccina", "smiley"],
  ["a smiley face", "smiley"],
  ["il fantasma", "ghost"],
  ["Ghosts", "ghost"],
  ["la ciambella", "donut"],
  ["a doughnut", "donut"],
  ["il sole", "sun"],
  ["the sun", "sun"],
  // German, Spanish and French (TASK-210 F), whatever the app's language.
  ["Herz", "heart"],
  ["ein Herz", "heart"],
  ["das Pferd", "horse"],
  ["Hundekopf", "dog_head"],
  ["der Hund", "dog_head"],
  ["Kürbis", "pumpkin"],
  ["kurbis", "pumpkin"],
  ["ein Weihnachtsbaum", "christmas_tree"],
  ["die Sonne", "sun"],
  ["corazón", "heart"],
  ["un corazon", "heart"],
  ["la estrella", "star"],
  ["cabeza de perro", "dog_head"],
  ["el árbol de Navidad", "christmas_tree"],
  ["dónut", "donut"],
  ["el sol", "sun"],
  ["cœur", "heart"],
  ["Coeur", "heart"],
  ["un cœur", "heart"],
  ["l'étoile", "star"],
  ["l’étoile", "star"],
  ["une etoile", "star"],
  ["tête de chien", "dog_head"],
  ["le sapin de Noël", "christmas_tree"],
  ["les escargots", "snail"],
  ["fantôme", "ghost"],
])("%j is a %s", (text, shape) => {
  expect(toShape(text)).toBe(shape);
});

test.each([
  ["", "empty"],
  ["   ", "only spaces"],
  ["drago", "not in the catalogue"],
  ["casa", "an outline that is not a shape (ADR-0036)"],
  ["stemma della Ferrari", "a phrase: the AI's job (TASK-030)"],
  ["una", "an article alone"],
  ["cuore stella", "two shapes"],
  ["uccello", "an animal the user left out (ADR-0061)"],
  ["bird", "an animal the user left out (ADR-0061)"],
  ["albero", "a plain tree is not the Christmas tree (ADR-0084)"],
  ["tree", "a plain tree is not the Christmas tree (ADR-0084)"],
  ["natale", "a feast, not a drawing: the AI's job"],
  ["Baum", "a plain tree is not the Christmas tree (ADR-0084)"],
  ["sapin", "a fir is not the Christmas tree (ADR-0084)"],
  ["árbol", "a plain tree is not the Christmas tree (ADR-0084)"],
  ["Vogel", "an animal the user left out (ADR-0061)"],
  ["ein", "an article alone"],
])("%j is no shape: %s", (text) => {
  expect(toShape(text)).toBeNull();
});

const LANGUAGES = ["en", "de", "it", "es", "fr"] as const;

test("every shape of the contract has words in the five languages", () => {
  for (const shape of SHAPES) {
    for (const language of LANGUAGES) {
      expect(SHAPE_WORDS[shape][language].length).toBeGreaterThan(0);
    }
  }
});

test("every word names its own shape, and no word is used twice in a language", () => {
  // A word under two shapes would name only one of them: «luna», Italian
  // and Spanish, is the same moon.
  for (const shape of SHAPES) {
    for (const language of LANGUAGES) {
      const words = SHAPE_WORDS[shape][language];
      expect(new Set(words.map((word) => word.toLowerCase())).size).toBe(words.length);
      for (const word of words) {
        expect(toShape(word)).toBe(shape);
      }
    }
  }
});

test("the suggestion lists every shape, as the runner reads it", () => {
  expect(shapeList()).toBe(
    "circle, heart, star, horse, moon, cat, fish, butterfly, snail, dog head, rabbit head, pumpkin, christmas tree, smiley, ghost, donut or sun",
  );
});

test("a shape's name on screen is a word of its own", () => {
  expect(shapeName("dog_head")).toBe("dog head");
  expect(shapeName("heart")).toBe("heart");
  for (const shape of SHAPES) {
    expect(toShape(shapeName(shape))).toBe(shape);
  }
});
