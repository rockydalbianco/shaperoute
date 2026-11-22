import { diaryWithDay, NO_DIARY } from "./diary";
import { NO_EDITS, withActivityKcal, withRest } from "./energyEdits";
import type { Food } from "./foods";
import { NUTRITION_ON } from "./nutritionOn";
import {
  diaryFile,
  loadDiaryMonth,
  loadOwnFoods,
  loadPlan,
  loadSettings,
  NO_SETTINGS,
  OWN_FOODS_FILE,
  PLAN_FILE,
  saveDiaryMonth,
  saveOwnFoods,
  savePlan,
  saveSettings,
  SETTINGS_FILE,
  settingsFrom,
} from "./nutritionStore";
import { addOwnFood, NO_OWN_FOODS, removeOwnFood } from "./ownFoods";
import { NO_MEALS, NO_PLAN, planWithDay, withPortion } from "./plan";

// The phone's documents folder, in memory, as in body/bodyProfile.test.ts.

jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  const state = { failing: false };
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      if (state.failing) {
        throw new Error("No space left on device");
      }
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
  return { File, Paths: { document: { uri: "file:///documents/" } }, files, state };
});

const disk = jest.requireMock<{
  files: Map<string, string>;
  state: { failing: boolean };
}>("expo-file-system");

function uri(name: string): string {
  return `file:///documents/${name}`;
}

afterEach(() => {
  disk.files.clear();
  disk.state.failing = false;
});

const OATS: Food = {
  key: "usda-1",
  name: "Oats",
  kcalPer100g: 379,
  proteinPer100g: 13.2,
  carbsPer100g: 67.7,
  fatPer100g: 6.5,
  source: "table",
};
const BREAKFAST = withPortion(NO_MEALS, "breakfast", { food: OATS, grams: 60 });

test("«Nutrition» is off in every build until the native build is out", () => {
  expect(NUTRITION_ON).toBe(false);
});

test("with nothing kept, everything is as new", () => {
  expect(loadOwnFoods()).toEqual(NO_OWN_FOODS);
  expect(loadPlan()).toEqual(NO_PLAN);
  expect(loadSettings()).toEqual(NO_SETTINGS);
  expect(loadDiaryMonth("2026-11")).toEqual(NO_DIARY);
});

test("the user's foods are read back at the next opening", () => {
  const added = addOwnFood(NO_OWN_FOODS, { name: "Granola", kcalPer100g: 450 });
  expect(saveOwnFoods(added!.own)).toBe(true);
  expect(loadOwnFoods()).toEqual(added!.own);
});

test("the counter of the keys is kept with no food left", () => {
  const added = addOwnFood(NO_OWN_FOODS, { name: "Granola", kcalPer100g: 450 });
  saveOwnFoods(removeOwnFood(added!.own, "own-1"));
  expect(disk.files.has(uri(OWN_FOODS_FILE))).toBe(true);
  expect(loadOwnFoods()).toEqual({ next: 2, foods: [] });
});

test("the plan is read back, and an empty plan removes its file", () => {
  const plan = planWithDay(NO_PLAN, "mon", BREAKFAST);
  expect(savePlan(plan)).toBe(true);
  expect(loadPlan()).toEqual(plan);
  savePlan(NO_PLAN);
  expect(disk.files.has(uri(PLAN_FILE))).toBe(false);
  expect(loadPlan()).toEqual(NO_PLAN);
});

test("the notice read, the target and the corrections are read back", () => {
  const settings = {
    noticeSeen: true,
    target: 1850,
    edits: withActivityKcal(withRest(NO_EDITS, 1540), "run-1", 520),
  };
  expect(saveSettings(settings)).toBe(true);
  expect(disk.files.has(uri(SETTINGS_FILE))).toBe(true);
  expect(loadSettings()).toEqual(settings);
});

test("settings that do not read are as new: the notice is shown again", () => {
  expect(settingsFrom({ noticeSeen: "yes", target: -1, edits: 3 })).toEqual(
    NO_SETTINGS,
  );
  disk.files.set(uri(SETTINGS_FILE), "{not json");
  expect(loadSettings()).toEqual(NO_SETTINGS);
});

test("the diary is kept a month to a file", () => {
  const diary = diaryWithDay(
    diaryWithDay(NO_DIARY, "2026-11-30", BREAKFAST),
    "2026-12-01",
    BREAKFAST,
  );
  expect(saveDiaryMonth("2026-11", diary)).toBe(true);
  expect(saveDiaryMonth("2026-12", diary)).toBe(true);
  expect([...disk.files.keys()].sort()).toEqual([
    uri(diaryFile("2026-11")),
    uri(diaryFile("2026-12")),
  ]);
  expect(loadDiaryMonth("2026-11")).toEqual({ "2026-11-30": BREAKFAST });
  expect(loadDiaryMonth("2026-12")).toEqual({ "2026-12-01": BREAKFAST });
});

test("a month with no day written removes its file", () => {
  saveDiaryMonth("2026-11", diaryWithDay(NO_DIARY, "2026-11-23", BREAKFAST));
  saveDiaryMonth("2026-11", NO_DIARY);
  expect(disk.files.size).toBe(0);
});

test("a month that is not a month is neither read nor written", () => {
  expect(saveDiaryMonth("2026-13", NO_DIARY)).toBe(false);
  expect(saveDiaryMonth("../body", NO_DIARY)).toBe(false);
  expect(loadDiaryMonth("november")).toEqual(NO_DIARY);
  expect(disk.files.size).toBe(0);
});

test("a phone that refuses to keep a file says so", () => {
  disk.state.failing = true;
  expect(savePlan(planWithDay(NO_PLAN, "mon", BREAKFAST))).toBe(false);
  expect(saveSettings({ ...NO_SETTINGS, noticeSeen: true })).toBe(false);
  expect(loadPlan()).toEqual(NO_PLAN);
});

test("nothing of «Nutrition» is kept outside its own files", () => {
  saveOwnFoods(addOwnFood(NO_OWN_FOODS, { name: "Granola", kcalPer100g: 450 })!.own);
  savePlan(planWithDay(NO_PLAN, "mon", BREAKFAST));
  saveSettings({ ...NO_SETTINGS, noticeSeen: true });
  saveDiaryMonth("2026-11", diaryWithDay(NO_DIARY, "2026-11-23", BREAKFAST));
  for (const name of disk.files.keys()) {
    expect(name).toMatch(/^file:\/\/\/documents\/nutrition-/);
  }
  expect(disk.files.size).toBe(4);
});
