import prizes from "@shaperoute/shared-types/fixtures/game-prizes.json";
import type { GamePrizeState } from "@shaperoute/shared-types";

import { saveLanguageChoice } from "../i18n/language";
import { isGamePrizes } from "./prizesApi";
import {
  badgeName,
  editionAlong,
  editionName,
  frameName,
  prizeAlong,
  prizeNeed,
  titleName,
} from "./prizesText";

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

const state = (id: string, value: number, target: number): GamePrizeState => ({
  id,
  got: value >= target,
  value,
  target,
});

test("the API's example of the prizes is what the app reads", () => {
  expect(isGamePrizes(prizes)).toBe(true);
  expect(isGamePrizes({ ...prizes, editions: { silver: 1 } })).toBe(false);
  expect(isGamePrizes({ ...prizes, shown: { frame: null, title: null } })).toBe(false);
});

test("every title and badge of the API has its name and what it asks", () => {
  const titles = [
    "runner",
    "explorer",
    "traveller",
    "globetrotter",
    "marathoner",
    "ultra",
    "steady",
    "collector",
  ];
  const badges = [
    "streak_4",
    "streak_12",
    "streak_52",
    "medals_10",
    "medals_50",
    "gold_10",
    "team_1",
    "team_10",
  ];
  for (const id of titles) {
    expect(titleName(id)).not.toBe(id);
    expect(prizeNeed(state(id, 0, 10), "km")).not.toBe("");
  }
  for (const id of badges) {
    expect(badgeName(id)).not.toBe(id);
    expect(prizeNeed(state(id, 0, 10), "km")).not.toBe("");
  }
  // One the app does not know yet: its id.
  expect(titleName("swimmer")).toBe("swimmer");
  expect(badgeName("swim_10")).toBe("swim_10");
});

test("what a prize asks and how far along, in the app's units", () => {
  expect(prizeNeed(state("explorer", 420_000, 1_000_000), "km")).toBe(
    "1000 km in total",
  );
  expect(prizeAlong(state("explorer", 420_000, 1_000_000), "km")).toBe("420 / 1000 km");
  expect(prizeAlong(state("runner", 42_000, 100_000), "mi")).toBe("26.1 / 62.1 mi");
  expect(prizeNeed(state("steady", 4, 26), "km")).toBe(
    "26 weeks in a row with an outing",
  );
  expect(prizeAlong(state("steady", 4, 26), "km")).toBe("4 / 26");
  expect(prizeNeed(state("team_1", 0, 1), "km")).toBe("1 team challenge completed");
  // Reached at once: no «0 / 1».
  expect(prizeAlong(state("marathoner", 0, 1), "km")).toBe("");
  expect(prizeNeed(state("marathoner", 0, 1), "km")).toBe("Run a marathon");
});

test("the editions in words, and the runs to the next", () => {
  expect(editionName("silver")).toBe("Silver edition");
  expect(editionName("gold")).toBe("Gold edition");
  expect(editionAlong("bronze", 2)).toBe("2 of 3 runs for silver");
  expect(editionAlong("silver", 4)).toBe("4 of 10 runs for gold");
  expect(editionAlong("gold", 12)).toBeNull();
  expect(frameName("Animals")).toBe("Animals frame");
});

test("in Italian", () => {
  saveLanguageChoice("it");
  expect(titleName("explorer")).toBe("Esploratore");
  expect(editionAlong("bronze", 2)).toBe("2 corse su 3 per l'argento");
  expect(frameName("Animali")).toBe("Cornice Animali");
});
