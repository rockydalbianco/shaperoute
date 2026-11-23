import {
  activitiesOn,
  countedActivities,
  type DayActivity,
  dayBalance,
  usedKcal,
} from "./dayBalance";
import { NO_EDITS, withActivityKcal } from "./energyEdits";

const DAY = "2026-11-23";

/** A time of 23 November 2026, by the phone's clock. */
function at(hour: number, minute: number = 0, date: number = 23): number {
  return new Date(2026, 10, date, hour, minute).getTime();
}

function muw(key: string, start: number, end: number, kcal: number): DayActivity {
  return { key, source: "muw", writtenByMuw: false, startMs: start, endMs: end, kcal };
}

function health(
  key: string,
  start: number,
  end: number,
  kcal: number,
  writtenByMuw: boolean = false,
): DayActivity {
  return { key, source: "health", writtenByMuw, startMs: start, endMs: end, kcal };
}

const RUN = muw("run-1", at(7), at(8), 600);
const GYM = muw("gym-1", at(18), at(19), 250);

test("used is the day at rest plus the activities of the day", () => {
  expect(
    usedKcal({
      restKcalPerDay: 1619,
      activities: [RUN, GYM],
      healthActiveKcal: null,
      edits: NO_EDITS,
    }),
  ).toEqual({ rest: 1619, active: 850, used: 2469, fromHealth: false });
});

test("a day with no activity uses its rest alone", () => {
  expect(
    usedKcal({
      restKcalPerDay: 1619,
      activities: [],
      healthActiveKcal: null,
      edits: NO_EDITS,
    }),
  ).toEqual({ rest: 1619, active: 0, used: 1619, fromHealth: false });
});

test("with Health's active energy that alone counts, MuW's are not added on top", () => {
  expect(
    usedKcal({
      restKcalPerDay: 1619,
      activities: [RUN, GYM],
      healthActiveKcal: 1030,
      edits: NO_EDITS,
    }),
  ).toEqual({ rest: 1619, active: 1030, used: 2649, fromHealth: true });
});

test("Health's active energy of zero is still Health's answer", () => {
  expect(
    usedKcal({
      restKcalPerDay: 1619,
      activities: [RUN],
      healthActiveKcal: 0,
      edits: NO_EDITS,
    }),
  ).toMatchObject({ active: 0, fromHealth: true });
});

test("a workout MuW itself wrote to Health is not counted twice", () => {
  const copy = health("hk-1", at(7), at(8), 600, true);
  expect(countedActivities([RUN, copy])).toEqual([RUN]);
});

test("the same outing recorded by another app counts once, as MuW's", () => {
  // The watch started two minutes later and stopped a minute earlier.
  const watch = health("hk-2", at(7, 2), at(7, 59), 640);
  expect(countedActivities([watch, RUN])).toEqual([RUN]);
});

test("a workout of another app at another time counts on its own", () => {
  const yoga = health("hk-3", at(12), at(12, 45), 120);
  expect(countedActivities([RUN, yoga]).map((activity) => activity.key)).toEqual([
    "run-1",
    "hk-3",
  ]);
  expect(
    usedKcal({
      restKcalPerDay: 1600,
      activities: [RUN, yoga],
      healthActiveKcal: null,
      edits: NO_EDITS,
    }).active,
  ).toBe(720);
});

test("two outings count as one only past half of the shorter", () => {
  // A 20 minute cool-down that begins in the last 10 minutes of the run:
  // exactly half of it is shared, which is not more than half.
  const half = health("hk-4", at(7, 50), at(8, 10), 80);
  expect(countedActivities([RUN, half])).toHaveLength(2);
  const more = health("hk-5", at(7, 49), at(8, 9), 80);
  expect(countedActivities([RUN, more])).toEqual([RUN]);
});

test("two other apps that recorded the same outing count once, the earliest", () => {
  const first = health("hk-b", at(12), at(13), 300);
  const second = health("hk-a", at(12, 1), at(13), 310);
  expect(countedActivities([second, first])).toEqual([first]);
});

test("an activity with no length is never taken for another", () => {
  const point = health("hk-6", at(7, 30), at(7, 30), 10);
  expect(countedActivities([RUN, point])).toHaveLength(2);
});

test("an activity belongs to the day it started on", () => {
  const late = muw("run-2", at(23, 30), at(0, 40, 24), 500);
  const next = muw("run-3", at(6, 0, 24), at(7, 0, 24), 400);
  expect(activitiesOn([RUN, late, next], DAY)).toEqual([RUN, late]);
  expect(activitiesOn([RUN, late, next], "2026-11-24")).toEqual([next]);
});

test("an activity corrected by hand counts for the user's number", () => {
  const edits = withActivityKcal(NO_EDITS, "run-1", 520);
  expect(
    usedKcal({
      restKcalPerDay: 1619,
      activities: [RUN, GYM],
      healthActiveKcal: null,
      edits,
    }),
  ).toMatchObject({ active: 770, used: 2389 });
});

test("on a day counted from Health, a correction moves the day by its difference", () => {
  const edits = withActivityKcal(NO_EDITS, "run-1", 520);
  // 1030 from Health, and the run 80 less than it counted for.
  expect(
    usedKcal({
      restKcalPerDay: 1619,
      activities: [RUN, GYM],
      healthActiveKcal: 1030,
      edits,
    }),
  ).toMatchObject({ active: 950, used: 2569, fromHealth: true });
});

test("a correction never takes the day's activity below zero", () => {
  const edits = withActivityKcal(NO_EDITS, "run-1", 0);
  expect(
    usedKcal({
      restKcalPerDay: 1619,
      activities: [RUN],
      healthActiveKcal: 200,
      edits,
    }).active,
  ).toBe(0);
});

test("a correction of an activity that is not counted changes nothing", () => {
  const copy = health("hk-1", at(7), at(8), 600, true);
  const edits = withActivityKcal(NO_EDITS, "hk-1", 100);
  expect(
    usedKcal({
      restKcalPerDay: 1619,
      activities: [RUN, copy],
      healthActiveKcal: null,
      edits,
    }).active,
  ).toBe(600);
});

test("the day still running counts its rest up to now", () => {
  expect(
    usedKcal({
      restKcalPerDay: 1600,
      fraction: 0.25,
      activities: [RUN],
      healthActiveKcal: null,
      edits: NO_EDITS,
    }),
  ).toEqual({ rest: 400, active: 600, used: 1000, fromHealth: false });
});

const USED = { rest: 1619, active: 850, used: 2469, fromHealth: false };

test("the balance is eaten less used: below zero a deficit", () => {
  expect(dayBalance(2059, USED)).toEqual({
    ...USED,
    eaten: 2059,
    balance: -410,
    kind: "deficit",
  });
});

test("above zero the balance is a surplus, at zero it is even", () => {
  expect(dayBalance(2789, USED)).toMatchObject({ balance: 320, kind: "surplus" });
  expect(dayBalance(2469, USED)).toMatchObject({ balance: 0, kind: "even" });
});

test("a day with nothing written stays empty: no balance at all", () => {
  expect(dayBalance(null, USED)).toBeNull();
});

test("a day of zero calories written is a day, with its deficit", () => {
  expect(dayBalance(0, USED)).toMatchObject({ eaten: 0, balance: -2469 });
});
