import type { RouteRequest } from "@shaperoute/shared-types";

import {
  checkWord,
  MAX_APP_WORD_LETTERS,
  maxWordLetters,
  routeName,
  wordDistanceM,
} from "./wordInput";

test("a word of known letters goes in capitals, trimmed", () => {
  expect(checkWord("  ciao ", 12_000)).toEqual({ ok: true, word: "CIAO" });
  expect(checkWord("Kiwi", 21_000)).toEqual({ ok: true, word: "KIWI" });
});

test("an empty field asks for a word", () => {
  expect(checkWord("   ", 5_000)).toEqual({
    ok: false,
    problem: "Write a word to draw, with the letters A to Z.",
  });
});

test("spaces inside are refused", () => {
  expect(checkWord("ciao mamma", 21_000)).toEqual({
    ok: false,
    problem: "One word only, without spaces.",
  });
});

test("a letter out of the alphabet is named, in capitals", () => {
  expect(checkWord("città", 15_000)).toEqual({
    ok: false,
    problem: "No letter “À”: a word can use only the letters A to Z, without accents.",
  });
  expect(checkWord("r2d2", 15_000)).toMatchObject({
    ok: false,
    problem: expect.stringContaining("“2”"),
  });
  // One character, even when it takes two UTF-16 units.
  expect(checkWord("hi🙂", 15_000)).toMatchObject({
    problem: expect.stringContaining("“🙂”"),
  });
  // ß has no single capital: shown as typed.
  expect(checkWord("fuß", 15_000)).toMatchObject({
    problem: expect.stringContaining("“ß”"),
  });
});

test("the app stops at 7 letters: 3 km each, up to 21 km", () => {
  expect(MAX_APP_WORD_LETTERS).toBe(7);
  expect(checkWord("abcdefg", 21_000)).toEqual({ ok: true, word: "ABCDEFG" });
  expect(checkWord("abcdefgh", 21_000)).toEqual({
    ok: false,
    problem: "At most 7 letters: each needs 3 km, and the app goes up to 21 km.",
  });
});

test("by bike, up to 30 km, a word has the contract's 8 letters (TASK-190)", () => {
  expect(maxWordLetters("running")).toBe(MAX_APP_WORD_LETTERS);
  expect(maxWordLetters("cycling")).toBe(8);
  expect(checkWord("abcdefgh", 24_000, "cycling")).toEqual({
    ok: true,
    word: "ABCDEFGH",
  });
  expect(checkWord("abcdefghi", 30_000, "cycling")).toEqual({
    ok: false,
    problem: "At most 8 letters.",
  });
  // A run says what it always said.
  expect(checkWord("abcdefgh", 21_000, "running")).toEqual(
    checkWord("abcdefgh", 21_000),
  );
  // The least distance is the same by bike.
  expect(checkWord("ciao", 10_000, "cycling")).toEqual({
    ok: false,
    problem: "“CIAO” needs at least 12 km: 3 km for each letter.",
    needsDistanceM: 12_000,
  });
});

test("a distance short of 3 km a letter says the least one", () => {
  expect(checkWord("ciao", 11_000)).toEqual({
    ok: false,
    problem: "“CIAO” needs at least 12 km: 3 km for each letter.",
    needsDistanceM: 12_000,
  });
  expect(wordDistanceM("CIAO")).toBe(12_000);
});

test("a distance not valid is left to the distance field", () => {
  expect(checkWord("ciao", null)).toEqual({ ok: true, word: "CIAO" });
});

test("the route's name is the word, quoted, or the shape as read", () => {
  const base = {
    start: [46, 11] as [number, number],
    distance_m: 12_000,
    activity: "running" as const,
  };
  expect(routeName({ ...base, word: "CIAO" } satisfies RouteRequest)).toBe("“CIAO”");
  expect(routeName({ ...base, shape: "heart" } satisfies RouteRequest)).toBe("heart");
  expect(routeName({ ...base, shape: "dog_head" } satisfies RouteRequest)).toBe(
    "dog head",
  );
});
