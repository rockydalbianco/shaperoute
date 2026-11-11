import type { GameGoal, GameMe, GameShape } from "@shaperoute/shared-types";

import { saveLanguageChoice } from "../i18n/language";
import { FIRST_STEP_S, levelBefore, shapeProgress } from "./shapeProgress";

// The phone's documents folder, in memory: the language.
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, Paths: { document: { uri: "file:///documents/" } } };
});

afterEach(() => {
  saveLanguageChoice("phone");
});

/** A shape of the catalog with this goal. */
function shape(id: string, goal: GameGoal): GameShape {
  return {
    id,
    names: { en: id, de: id, it: id, es: id, fr: id },
    goal,
    outline: [
      [0, 0],
      [1, 0],
      [0, 0],
    ],
  };
}

const pace = (distance_m: number, pace_s: number, single_run = false): GameGoal => ({
  kind: "pace",
  total_m: null,
  distance_m,
  pace_s,
  single_run,
});

// The ladder of 400 m, as in the catalog: 4:30, 4:00, 3:30, 3:00 a km.
const DUCK = shape("duck", pace(400, 270));
const RABBIT = shape("rabbit", pace(400, 240));
const DOG = shape("dog", pace(400, 210));
const CHEETAH = shape("cheetah", pace(400, 180));
const CACTUS = shape("cactus", pace(15000, 420));
const VOLCANO = shape("volcano", pace(15000, 270));
const CAKE = shape("cake", pace(21097, 1200, true));
const FLOWER = shape("flower", {
  kind: "distance",
  total_m: 200000,
  distance_m: null,
  pace_s: null,
});
const SHAPES = [DUCK, RABBIT, DOG, CHEETAH, CACTUS, VOLCANO, CAKE, FLOWER];

/** A runner of some months: 400 m at best at 5:00 a km, 12 km at most. */
const ME: GameMe = {
  counted_m: 150000,
  longest_m: 12000,
  best_s: { "400": 120, "1000": 320 },
  shapes: [],
};

test("a pace far from the level before it is empty, not 60 %", () => {
  // The case the user met: 400 m at 5:00 /km against 3:00 /km.
  const cheetah = shapeProgress(CHEETAH, SHAPES, ME, "km");
  expect(cheetah).toEqual({ share: 0, line: "Best 5:00 /km · 2:00 /km to go" });
  // The level before the cheetah is the dog (3:30), not done either.
  expect(levelBefore(SHAPES, 400, 180)).toBe(210);
});

test("between the level before and this one, the bar says how far", () => {
  // 4:15 /km: half way from the duck (4:30) to the rabbit (4:00).
  const me = { ...ME, best_s: { "400": 102 } };
  expect(shapeProgress(RABBIT, SHAPES, me, "km")).toEqual({
    share: 0.5,
    line: "Best 4:15 /km · 0:15 /km to go",
  });
  // The easiest level starts a minute slower: from 5:30 to 4:30.
  expect(levelBefore(SHAPES, 400, 270)).toBe(270 + FIRST_STEP_S);
  expect(shapeProgress(DUCK, SHAPES, ME, "km").share).toBe(0.5);
});

test("a distance never run in one go: no bar, what to do first", () => {
  for (const each of [CACTUS, VOLCANO]) {
    expect(shapeProgress(each, SHAPES, ME, "km")).toEqual({
      share: null,
      line: "First run 15 km in one go · longest 12 km",
    });
  }
  // Run that far, but not as a run that counts its time: said so.
  expect(shapeProgress(CACTUS, SHAPES, { ...ME, longest_m: 16000 }, "km")).toEqual({
    share: null,
    line: "No time over 15 km yet",
  });
});

test("a milestone and a total keep their share of the way", () => {
  expect(shapeProgress(CAKE, SHAPES, ME, "km")).toEqual({
    share: 0.57,
    line: "Longest run 12 km",
  });
  expect(shapeProgress(FLOWER, SHAPES, ME, "km")).toEqual({
    share: 0.75,
    line: "150.0 / 200 km",
  });
  // Never past 99 % before the shape is unlocked.
  expect(shapeProgress(FLOWER, SHAPES, { ...ME, counted_m: 250000 }, "km").share).toBe(
    0.99,
  );
});

test("in miles and in Italian", () => {
  expect(shapeProgress(CHEETAH, SHAPES, ME, "mi").line).toBe(
    "Best 8:03 /mi · 3:13 /mi to go",
  );
  saveLanguageChoice("it");
  expect(shapeProgress(CACTUS, SHAPES, ME, "km").line).toBe(
    "Prima corri 15 km di fila · finora 12 km",
  );
  expect(shapeProgress(CHEETAH, SHAPES, ME, "km").line).toBe(
    "Migliore 5:00 /km · mancano 2:00 /km",
  );
});
