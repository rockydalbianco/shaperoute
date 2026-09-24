import { MAX_APP_DISTANCE_KM, stepDistance, toDistanceM } from "./distance";

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
