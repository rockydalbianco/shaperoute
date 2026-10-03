import { DISTANCE_LIMITS_M } from "@shaperoute/shared-types";

import {
  APP_DISTANCE_LIMITS_KM,
  distanceForSport,
  fitDistance,
  MAX_APP_DISTANCE_KM,
  stepDistance,
  toDistanceM,
} from "./distance";

test.each([
  ["7", 7000],
  ["7,5", 7500],
  ["7.5", 7500],
  [" 12 ", 12000],
  ["1,1", 1100],
  ["1", 1000],
  [String(MAX_APP_DISTANCE_KM), MAX_APP_DISTANCE_KM * 1000],
])("%j km is %i m", (text, metres) => {
  expect(toDistanceM(text)).toBe(metres);
});

test.each([
  ["0,5", "below 1 km"],
  ["abc", "not a number"],
  ["7,55", "two decimals"],
  ["", "empty"],
  [" ", "only a space"],
  ["7,", "a comma without the decimal"],
  [",5", "no whole km"],
  ["-5", "negative"],
  ["7 5", "a space inside"],
  [`${MAX_APP_DISTANCE_KM},1`, "just over the app limit"],
  ["50", "within the engine limit, over the app one"],
])("%j is not a distance: %s", (text) => {
  expect(toDistanceM(text)).toBeNull();
});

test.each([
  ["5", 1, "6"],
  ["5", -1, "4"],
  ["7,5", 1, "8,5"],
  ["7.5", -1, "6.5"],
  ["1", -1, "1"],
  ["1,5", -1, "1"],
  ["21", 1, "21"],
  ["20,5", 1, "21"],
  ["30", -1, "21"],
  ["0", 1, "1"],
  ["", 1, "1"],
  ["abc", -1, "1"],
])("%j stepped by %i is %j", (text, steps, expected) => {
  expect(stepDistance(text, steps)).toBe(expected);
});

// By bike (TASK-190): the contract's limits, 10–30 km.

test("a run keeps 1 to 21 km; a bike route has the contract's 10 to 30", () => {
  expect(APP_DISTANCE_LIMITS_KM.running).toEqual([1, MAX_APP_DISTANCE_KM]);
  expect(APP_DISTANCE_LIMITS_KM.cycling).toEqual([10, 30]);
  expect(APP_DISTANCE_LIMITS_KM.cycling.map((km) => km * 1000)).toEqual(
    DISTANCE_LIMITS_M.cycling,
  );
});

test.each([
  ["10", 10000],
  ["12,5", 12500],
  ["21.1", 21100],
  ["30", 30000],
])("by bike %j km is %i m", (text, metres) => {
  expect(toDistanceM(text, "cycling")).toBe(metres);
});

test.each([
  ["9,9", "just under the bike's least"],
  ["5", "a run's distance"],
  ["30,1", "just over the bike's most"],
  ["50", "within the engine limit of a run"],
  ["", "empty"],
])("by bike %j is not a distance: %s", (text) => {
  expect(toDistanceM(text, "cycling")).toBeNull();
});

test.each([
  ["10", -1, "10"],
  ["10", 1, "11"],
  ["29,5", 1, "30"],
  ["30", 1, "30"],
  ["5", 1, "10"],
  ["40", -1, "30"],
  ["", 1, "10"],
  ["abc", -1, "10"],
])("by bike %j stepped by %i is %j", (text, steps, expected) => {
  expect(stepDistance(text, steps, "cycling")).toBe(expected);
});

test.each([
  ["5", "running", "5"],
  ["7,5", "running", "7,5"],
  ["5", "cycling", "10"],
  ["12,5", "cycling", "12,5"],
  ["25", "running", "21"],
  ["25", "cycling", "25"],
  ["abc", "cycling", "10"],
] as const)("%j fits a %s as %j", (text, activity, expected) => {
  expect(fitDistance(text, activity)).toBe(expected);
});

test("paddling goes from 1 to 5 km, as its contract (TASK-191)", () => {
  expect(APP_DISTANCE_LIMITS_KM.paddling).toEqual([1, 5]);
  expect(APP_DISTANCE_LIMITS_KM.paddling.map((km) => km * 1000)).toEqual(
    DISTANCE_LIMITS_M.paddling,
  );
});

test.each([
  ["1", 1000],
  ["2,5", 2500],
  ["3.5", 3500],
  ["5", 5000],
])("paddling %j km is %i m", (text, metres) => {
  expect(toDistanceM(text, "paddling")).toBe(metres);
});

test.each([
  ["0,9", "just under the least"],
  ["5,1", "just over the most"],
  ["10", "a bike's distance"],
])("paddling %j is not a distance: %s", (text) => {
  expect(toDistanceM(text, "paddling")).toBeNull();
});

test.each([
  ["2,5", 1, "3,5"],
  ["5", 1, "5"],
  ["1", -1, "1"],
  ["12", -1, "5"],
])("paddling %j stepped by %i is %j", (text, steps, expected) => {
  expect(stepDistance(text, steps, "paddling")).toBe(expected);
});

test.each([
  ["5", "running", "5"],
  ["25", "running", "21"],
  ["5", "cycling", "10"],
  ["12,5", "cycling", "12,5"],
  ["5", "paddling", "2"],
  ["3", "paddling", "2"],
  ["abc", "paddling", "2"],
] as const)("%j for a %s is %j", (text, activity, expected) => {
  expect(distanceForSport(text, activity)).toBe(expected);
});
