import {
  addDays,
  dayFraction,
  isLocalDay,
  localDayOf,
  monthOf,
  startOf,
  weekdayOf,
  weekOf,
} from "./localDay";

test("a day is the one the phone's calendar shows", () => {
  expect(localDayOf(new Date(2026, 10, 23, 0, 0))).toBe("2026-11-23");
  expect(localDayOf(new Date(2026, 10, 23, 23, 59))).toBe("2026-11-23");
  expect(localDayOf(new Date(2026, 0, 5, 12))).toBe("2026-01-05");
});

test("a day starts at the phone's midnight", () => {
  expect(startOf("2026-11-23")).toEqual(new Date(2026, 10, 23));
});

test("only a day of the calendar is a day", () => {
  expect(isLocalDay("2026-11-23")).toBe(true);
  expect(isLocalDay("2028-02-29")).toBe(true);
  expect(isLocalDay("2026-02-30")).toBe(false);
  expect(isLocalDay("2026-13-01")).toBe(false);
  expect(isLocalDay("2026-1-5")).toBe(false);
  expect(isLocalDay("today")).toBe(false);
  expect(isLocalDay(20261123)).toBe(false);
});

test("days are added by the calendar, across months and years", () => {
  expect(addDays("2026-11-23", 1)).toBe("2026-11-24");
  expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
  expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  expect(addDays("2026-11-23", 0)).toBe("2026-11-23");
  expect(addDays("nonsense", 3)).toBe("nonsense");
});

test("the week starts on Monday", () => {
  // 23 November 2026 is a Monday.
  expect(weekdayOf("2026-11-23")).toBe("mon");
  expect(weekdayOf("2026-11-28")).toBe("sat");
  expect(weekdayOf("2026-11-29")).toBe("sun");
  expect(weekOf("2026-11-26")).toEqual([
    "2026-11-23",
    "2026-11-24",
    "2026-11-25",
    "2026-11-26",
    "2026-11-27",
    "2026-11-28",
    "2026-11-29",
  ]);
  expect(weekOf("2026-11-29")[0]).toBe("2026-11-23");
});

test("the month of a day names its file", () => {
  expect(monthOf("2026-11-23")).toBe("2026-11");
});

test("how much of a day has gone by", () => {
  expect(dayFraction("2026-11-23", new Date(2026, 10, 22, 23))).toBe(0);
  expect(dayFraction("2026-11-23", new Date(2026, 10, 23, 0))).toBe(0);
  expect(dayFraction("2026-11-23", new Date(2026, 10, 23, 12))).toBeCloseTo(0.5, 6);
  expect(dayFraction("2026-11-23", new Date(2026, 10, 24, 0))).toBe(1);
  expect(dayFraction("2026-11-23", new Date(2026, 10, 25, 9))).toBe(1);
  expect(dayFraction("nonsense", new Date(2026, 10, 23, 12))).toBe(0);
});
