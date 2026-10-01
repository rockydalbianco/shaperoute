import type { RouteResult } from "@shaperoute/shared-types";

import { choiceLabel, choicesOf, likeness, pickedIndex } from "./choices";

function route(similarity: number, alternatives?: RouteResult[]): RouteResult {
  return {
    points: [
      [46.0671, 11.1214],
      [46.068, 11.122],
      [46.0671, 11.1214],
    ],
    distance_m: 5000,
    similarity,
    shape: "heart",
    warnings: [],
    directions: [],
    word: null,
    ...(alternatives === undefined ? {} : { alternatives }),
  };
}

describe("choices", () => {
  it("puts the engine's route first, then its alternatives", () => {
    const b = route(0.84);
    const c = route(0.8);
    const a = route(0.85, [b, c]);
    expect(choicesOf(a)).toEqual([a, b, c]);
  });

  it("has one route from an API without alternatives", () => {
    const only = route(0.85);
    expect(choicesOf(only)).toEqual([only]);
  });

  it("names the tiles A, B, C and says the likeness in percent", () => {
    expect([0, 1, 2].map(choiceLabel)).toEqual(["A", "B", "C"]);
    expect(likeness(route(0.8049))).toBe("80%");
    expect(likeness(route(0.911))).toBe("91%");
  });

  it("starts each new result from its first route", () => {
    const first = route(0.85, [route(0.84)]);
    const next = route(0.9, [route(0.88)]);
    expect(pickedIndex({ of: first, index: 1 }, first)).toBe(1);
    expect(pickedIndex({ of: first, index: 1 }, next)).toBe(0);
    expect(pickedIndex(null, first)).toBe(0);
    expect(pickedIndex({ of: first, index: 5 }, first)).toBe(1);
    expect(pickedIndex({ of: first, index: 1 }, null)).toBe(0);
  });
});
