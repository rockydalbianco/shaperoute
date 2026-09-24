import { SHAPES } from "@shaperoute/shared-types";

import { SHAPE_WORDS, shapeList, toShape } from "./shapeWords";

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

test("the suggestion lists every shape", () => {
  expect(shapeList()).toBe("circle, heart, star, horse, moon, cat or fish");
});
