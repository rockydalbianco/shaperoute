import type { Diary } from "./diary";
import { countDiaryDays, diaryMonths } from "./diaryDays";
import { NO_MEALS, withPortion } from "./plan";
import type { Food } from "./foods";

jest.mock("expo-file-system", () => ({
  File: class {},
  Directory: class {},
  Paths: { document: { uri: "file:///documents/" } },
}));

const APPLE = { key: "usda:apple", kcalPer100g: 52 } as unknown as Food;

test("only the diary's files are months", () => {
  expect(
    diaryMonths([
      "nutrition-diary-2026-11.json",
      "nutrition-settings.json",
      "nutrition-diary-2026-13.json",
      "body.json",
      "nutrition-diary-2026-09.json",
    ]),
  ).toEqual(["2026-09", "2026-11"]);
});

test("a day counts when something is written on it", () => {
  const eaten = withPortion(NO_MEALS, "lunch", { food: APPLE, grams: 150 });
  const months: Record<string, Diary> = {
    "2026-10": { "2026-10-01": eaten, "2026-10-02": NO_MEALS },
    "2026-11": { "2026-11-03": eaten, "2026-11-04": eaten },
  };
  expect(countDiaryDays(["2026-10", "2026-11"], (month) => months[month] ?? {})).toBe(
    3,
  );
  expect(countDiaryDays([], () => ({}))).toBe(0);
});
