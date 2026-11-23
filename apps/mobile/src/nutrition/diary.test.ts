import {
  dayOf,
  diaryFrom,
  diaryOfMonth,
  diaryWithDay,
  eatenAsPlanned,
  mealAsPlanned,
  NO_DIARY,
} from "./diary";
import type { Food } from "./foods";
import { NO_MEALS, NO_PLAN, planWithDay, planWithFood, withPortion } from "./plan";

function food(key: string, name: string, kcalPer100g: number): Food {
  return {
    key,
    name,
    kcalPer100g,
    proteinPer100g: null,
    carbsPer100g: null,
    fatPer100g: null,
    source: "table",
  };
}

const OATS = food("usda-1", "Oats", 379);
const PASTA = food("usda-3", "Pasta, dry", 371);

// 23 November 2026 is a Monday.
const MONDAY = "2026-11-23";
const TUESDAY = "2026-11-24";

const MONDAY_PLAN = withPortion(
  withPortion(NO_MEALS, "breakfast", { food: OATS, grams: 60 }),
  "lunch",
  { food: PASTA, grams: 90 },
);
const PLAN = planWithDay(NO_PLAN, "mon", MONDAY_PLAN);

test("a day with nothing written is empty, not zero", () => {
  expect(dayOf(NO_DIARY, MONDAY)).toBeNull();
  expect(dayOf({ [MONDAY]: NO_MEALS }, MONDAY)).toBeNull();
});

test("«Eaten as planned» writes the plan of that day of the week", () => {
  const diary = eatenAsPlanned(NO_DIARY, MONDAY, PLAN);
  expect(dayOf(diary, MONDAY)).toEqual(MONDAY_PLAN);
});

test("with nothing planned that day, «Eaten as planned» changes nothing", () => {
  expect(eatenAsPlanned(NO_DIARY, TUESDAY, PLAN)).toBe(NO_DIARY);
  const written = diaryWithDay(NO_DIARY, TUESDAY, MONDAY_PLAN);
  expect(eatenAsPlanned(written, TUESDAY, PLAN)).toBe(written);
});

test("a change to the plan afterwards does not reach a day already written", () => {
  const diary = eatenAsPlanned(NO_DIARY, MONDAY, PLAN);
  const later = planWithFood(PLAN, { ...OATS, kcalPer100g: 400 });
  expect(later.mon.breakfast[0].food.kcalPer100g).toBe(400);
  expect(dayOf(diary, MONDAY)?.breakfast[0].food.kcalPer100g).toBe(379);
});

test("one meal alone is taken from the plan, the others stay", () => {
  const dinner = withPortion(NO_MEALS, "dinner", { food: OATS, grams: 30 });
  const diary = mealAsPlanned(
    diaryWithDay(NO_DIARY, MONDAY, dinner),
    MONDAY,
    "lunch",
    PLAN,
  );
  expect(dayOf(diary, MONDAY)).toEqual({
    ...NO_MEALS,
    lunch: [{ food: PASTA, grams: 90 }],
    dinner: [{ food: OATS, grams: 30 }],
  });
  // Nothing is planned for Monday's snacks.
  expect(mealAsPlanned(diary, MONDAY, "snacks", PLAN)).toBe(diary);
});

test("taking the last portion away takes the day out of the diary", () => {
  const diary = diaryWithDay(NO_DIARY, MONDAY, MONDAY_PLAN);
  const emptied = diaryWithDay(diary, MONDAY, NO_MEALS);
  expect(Object.keys(emptied)).toEqual([]);
  expect(diaryWithDay(NO_DIARY, MONDAY, NO_MEALS)).toBe(NO_DIARY);
});

test("a day that is not a day is not written", () => {
  expect(diaryWithDay(NO_DIARY, "2026-02-30", MONDAY_PLAN)).toBe(NO_DIARY);
});

test("a month of the diary is the days of that month", () => {
  const diary = diaryWithDay(
    diaryWithDay(NO_DIARY, "2026-11-30", MONDAY_PLAN),
    "2026-12-01",
    MONDAY_PLAN,
  );
  expect(Object.keys(diaryOfMonth(diary, "2026-11"))).toEqual(["2026-11-30"]);
  expect(Object.keys(diaryOfMonth(diary, "2026-12"))).toEqual(["2026-12-01"]);
  expect(diaryOfMonth(diary, "2027-01")).toEqual({});
});

test("a diary kept reads back the same", () => {
  const diary = diaryWithDay(NO_DIARY, MONDAY, MONDAY_PLAN);
  expect(diaryFrom(JSON.parse(JSON.stringify(diary)))).toEqual(diary);
});

test("what does not read is left out", () => {
  expect(diaryFrom(null)).toEqual(NO_DIARY);
  expect(diaryFrom([MONDAY_PLAN])).toEqual(NO_DIARY);
  expect(
    diaryFrom({
      [MONDAY]: MONDAY_PLAN,
      yesterday: MONDAY_PLAN,
      [TUESDAY]: { breakfast: [] },
      "2026-11-25": "pasta",
    }),
  ).toEqual({ [MONDAY]: MONDAY_PLAN });
});
