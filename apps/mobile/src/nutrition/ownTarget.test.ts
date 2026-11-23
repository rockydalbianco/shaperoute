import { leftKcal, targetOf } from "./ownTarget";

test("the target is the whole number the user wrote", () => {
  expect(targetOf(1850)).toBe(1850);
  expect(targetOf(1849.6)).toBe(1850);
  expect(targetOf(1)).toBe(1);
  expect(targetOf(20000)).toBe(20000);
});

test("without a number that reads there is no target", () => {
  expect(targetOf(null)).toBeNull();
  expect(targetOf(undefined)).toBeNull();
  expect(targetOf(0)).toBeNull();
  expect(targetOf(-200)).toBeNull();
  expect(targetOf(20001)).toBeNull();
  expect(targetOf(Number.NaN)).toBeNull();
  expect(targetOf("1850")).toBeNull();
});

test("«Left» is the target less what was eaten", () => {
  expect(leftKcal(1850, 1240)).toBe(610);
  expect(leftKcal(1850, 2000)).toBe(-150);
});

test("a day with nothing written has the whole target left", () => {
  expect(leftKcal(1850, null)).toBe(1850);
});

test("no target, nothing left to show: MuW never makes one up", () => {
  expect(leftKcal(null, 1240)).toBeNull();
  expect(leftKcal(null, null)).toBeNull();
});
