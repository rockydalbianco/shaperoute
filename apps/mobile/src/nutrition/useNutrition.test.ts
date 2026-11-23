import { act, renderHook } from "@testing-library/react-native";

import type { Food } from "./foods";
import {
  diaryFile,
  loadDiaryMonth,
  loadOwnFoods,
  loadPlan,
  loadSettings,
  savePlan,
} from "./nutritionStore";
import { NO_MEALS, NO_PLAN, planWithDay, withPortion } from "./plan";
import {
  addFood,
  changeFood,
  copyPlanDay,
  forgetNutrition,
  mealsOn,
  removeFood,
  seeNotice,
  useNutrition,
  writeDay,
  writeDayAsPlanned,
  writePlanDay,
  writeTarget,
} from "./useNutrition";

// The phone's documents folder, in memory, as in nutritionStore.test.ts.

jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  const state = { reads: 0 };
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
      state.reads += 1;
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
  state: { reads: number };
}>("expo-file-system");

afterEach(() => {
  disk.files.clear();
  disk.state.reads = 0;
  forgetNutrition();
});

const OATS: Food = {
  key: "usda-173904",
  name: "Rolled oats",
  kcalPer100g: 379,
  proteinPer100g: 13.2,
  carbsPer100g: 67.7,
  fatPer100g: 6.5,
  source: "table",
};
const BREAKFAST = withPortion(NO_MEALS, "breakfast", { food: OATS, grams: 60 });

test("a day with nothing written has no portion in any meal", () => {
  expect(mealsOn("2026-11-23")).toBe(NO_MEALS);
});

test("a day written is kept on the phone, a month to a file", () => {
  expect(writeDay("2026-11-23", BREAKFAST)).toBe(true);
  expect(mealsOn("2026-11-23")).toEqual(BREAKFAST);
  expect(loadDiaryMonth("2026-11")).toEqual({ "2026-11-23": BREAKFAST });
  expect(disk.files.has(`file:///documents/${diaryFile("2026-11")}`)).toBe(true);
});

test("a day written is read back when the app opens again", () => {
  writeDay("2026-11-23", BREAKFAST);
  forgetNutrition();
  expect(mealsOn("2026-11-23")).toEqual(BREAKFAST);
  expect(mealsOn("2026-11-22")).toBe(NO_MEALS);
});

test("a day emptied goes out of the diary", () => {
  writeDay("2026-11-23", BREAKFAST);
  writeDay("2026-11-23", NO_MEALS);
  expect(mealsOn("2026-11-23")).toBe(NO_MEALS);
  expect(disk.files.size).toBe(0);
});

test("a month is read from the phone once", () => {
  writeDay("2026-11-23", BREAKFAST);
  forgetNutrition();
  disk.state.reads = 0;
  mealsOn("2026-11-23");
  mealsOn("2026-11-24");
  mealsOn("2026-11-01");
  expect(disk.state.reads).toBe(1);
});

test("the notice read is kept", () => {
  expect(seeNotice()).toBe(true);
  expect(loadSettings().noticeSeen).toBe(true);
});

test("the target is the user's number, or none", () => {
  expect(writeTarget(2000)).toBe(true);
  expect(loadSettings().target).toBe(2000);
  // Not a target: nothing changes.
  expect(writeTarget(0)).toBe(false);
  expect(writeTarget(Number.NaN)).toBe(false);
  expect(loadSettings().target).toBe(2000);
  expect(writeTarget(null)).toBe(true);
  expect(loadSettings().target).toBeNull();
});

test("a food of the user's is added, rewritten and removed", () => {
  const granola = addFood({ name: "Granola", kcalPer100g: 450 });
  expect(granola).toMatchObject({ key: "own-1", source: "own" });
  expect(addFood({ name: "", kcalPer100g: 450 })).toBeNull();
  expect(loadOwnFoods().foods).toEqual([granola]);

  expect(changeFood("own-1", { name: "Granola", kcalPer100g: 470 })).toMatchObject({
    key: "own-1",
    kcalPer100g: 470,
  });
  expect(changeFood("own-9", { name: "Granola", kcalPer100g: 470 })).toBeNull();
  expect(loadOwnFoods().foods[0].kcalPer100g).toBe(470);

  removeFood("own-1");
  expect(loadOwnFoods().foods).toEqual([]);
});

test("a food rewritten changes the plan, not the days already written", () => {
  const granola = addFood({ name: "Granola", kcalPer100g: 450 })!;
  const meals = withPortion(NO_MEALS, "breakfast", { food: granola, grams: 50 });
  savePlan(planWithDay(NO_PLAN, "mon", meals));
  forgetNutrition();
  writeDay("2026-11-23", meals);

  changeFood(granola.key, { name: "Granola", kcalPer100g: 470 });

  expect(loadPlan().mon.breakfast[0].food.kcalPer100g).toBe(470);
  expect(mealsOn("2026-11-23").breakfast[0].food.kcalPer100g).toBe(450);
});

test("the page is drawn again when something changes", async () => {
  const { result } = await renderHook(() => useNutrition());
  expect(result.current.settings.noticeSeen).toBe(false);
  expect(result.current.mealsOn("2026-11-23")).toBe(NO_MEALS);

  await act(async () => {
    seeNotice();
    writeDay("2026-11-23", BREAKFAST);
    addFood({ name: "Granola", kcalPer100g: 450 });
  });

  expect(result.current.settings.noticeSeen).toBe(true);
  expect(result.current.mealsOn("2026-11-23")).toEqual(BREAKFAST);
  expect(result.current.ownFoods.foods).toHaveLength(1);
});

test("two pages open at once show the same day", async () => {
  const first = await renderHook(() => useNutrition());
  const second = await renderHook(() => useNutrition());
  await act(async () => {
    writeTarget(1850);
  });
  expect(first.result.current.settings.target).toBe(1850);
  expect(second.result.current.settings.target).toBe(1850);
});

test("a day of the plan is written, and copied over another", () => {
  expect(writePlanDay("mon", BREAKFAST)).toBe(true);
  expect(loadPlan().mon).toEqual(BREAKFAST);
  expect(copyPlanDay("mon", "thu")).toBe(true);
  expect(loadPlan().thu).toEqual(BREAKFAST);
  expect(loadPlan().tue).toEqual(NO_MEALS);
});

test("«Eaten as planned» writes the day from the plan as it is now", () => {
  writePlanDay("mon", BREAKFAST);
  // 2026-11-23 is a Monday.
  expect(writeDayAsPlanned("2026-11-23")).toBe(true);
  expect(mealsOn("2026-11-23")).toEqual(BREAKFAST);
  expect(loadDiaryMonth("2026-11")).toEqual({ "2026-11-23": BREAKFAST });

  // The plan changed afterwards: the day written stays.
  writePlanDay("mon", NO_MEALS);
  expect(mealsOn("2026-11-23")).toEqual(BREAKFAST);
});

test("with nothing planned for that day of the week the diary stays as it is", () => {
  writePlanDay("mon", BREAKFAST);
  writeDayAsPlanned("2026-11-24");
  expect(mealsOn("2026-11-24")).toBe(NO_MEALS);
  expect(loadDiaryMonth("2026-11")).toEqual({});
});
