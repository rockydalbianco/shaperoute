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
])("%j is no shape: %s", (text) => {
  expect(toShape(text)).toBeNull();
});

test("every shape of the contract has English and Italian words", () => {
  for (const shape of SHAPES) {
    expect(SHAPE_WORDS[shape].en.length).toBeGreaterThan(0);
    expect(SHAPE_WORDS[shape].it.length).toBeGreaterThan(0);
  }
});

test("every word names its own shape, and no word is used twice", () => {
  const seen = new Set<string>();
  for (const shape of SHAPES) {
    for (const word of [...SHAPE_WORDS[shape].en, ...SHAPE_WORDS[shape].it]) {
      expect(seen.has(word)).toBe(false);
      seen.add(word);
      expect(toShape(word)).toBe(shape);
    }
  }
});

test("the suggestion lists every shape, as the runner reads it", () => {
  expect(shapeList()).toBe(
    "circle, heart, star, horse, moon, cat, fish, butterfly, snail, dog head or rabbit head",
  );
});

test("a shape's name on screen is a word of its own", () => {
  expect(shapeName("dog_head")).toBe("dog head");
  expect(shapeName("heart")).toBe("heart");
  for (const shape of SHAPES) {
    expect(toShape(shapeName(shape))).toBe(shape);
  }
});
