import {
  milesAtLeast,
  nearestTenths,
  readDistance,
  shownNumber,
  steppedDistance,
  switchedDistance,
  tenthsToM,
  typedTenths,
  unitsNumber,
  wholeMilesWithin,
  wholeUnits,
  writeDistance,
  writtenM,
} from "./distanceInput";

// The distance field of «Draw» in the app's units (TASK-182 part B).

const RUN_KM = [1, 21] as const;
const RUN_MI = [1, 13] as const;

test("a text in km is the number alone, a text in miles carries its unit", () => {
  expect(readDistance("7,5")).toEqual({ units: "km", number: "7,5" });
  expect(readDistance("4.5 mi")).toEqual({ units: "mi", number: "4.5" });
  // What is being typed, whatever it is, keeps its unit.
  expect(readDistance(" mi")).toEqual({ units: "mi", number: "" });
  expect(readDistance("abc mi")).toEqual({ units: "mi", number: "abc" });
  expect(readDistance("")).toEqual({ units: "km", number: "" });

  expect(writeDistance("7,5", "km")).toBe("7,5");
  expect(writeDistance("4.5", "mi")).toBe("4.5 mi");
  expect(writeDistance("", "mi")).toBe(" mi");
});

test.each([
  ["7", 70],
  ["7,5", 75],
  ["7.5", 75],
  [" 12 ", 120],
  ["0", 0],
])("%j typed is %i tenths", (number, tenths) => {
  expect(typedTenths(number)).toBe(tenths);
});

test.each(["7,55", "abc", "", "7,", ",5", "-5", "7 5", "4.5 mi"])(
  "%j is not a number typed",
  (number) => {
    expect(typedTenths(number)).toBeNull();
  },
);

test("tenths are whole metres, without the noise of a float", () => {
  expect(tenthsToM(75, "km")).toBe(7500);
  expect(tenthsToM(11, "km")).toBe(1100);
  // 1 mi = 1609.344 m: rounded once, to the metre.
  expect(tenthsToM(10, "mi")).toBe(1609);
  expect(tenthsToM(30, "mi")).toBe(4828);
  expect(tenthsToM(45, "mi")).toBe(7242);
  expect(tenthsToM(130, "mi")).toBe(20921);
  expect(tenthsToM(180, "mi")).toBe(28968);
  for (let tenths = 0; tenths <= 200; tenths++) {
    const metres = tenthsToM(tenths, "mi");
    expect(Number.isInteger(metres)).toBe(true);
    expect(Math.abs(metres - tenths * 160.9344)).toBeLessThanOrEqual(0.5);
  }
});

test("a text says its metres, in its own unit and to the metre", () => {
  expect(writtenM("5")).toBe(5000);
  expect(writtenM("7,5")).toBe(7500);
  // A km the app wrote from whole metres: three decimals.
  expect(writtenM("4.828")).toBe(4828);
  expect(writtenM("3 mi")).toBe(4828);
  expect(writtenM("4,5 mi")).toBe(7242);
  expect(writtenM("abc")).toBeNull();
  expect(writtenM(" mi")).toBeNull();
  expect(writtenM("1.2345")).toBeNull();
});

test("the whole units nearest a distance, within the limits", () => {
  expect(wholeUnits(5000, "mi", RUN_MI)).toBe(3);
  expect(wholeUnits(21_000, "mi", RUN_MI)).toBe(13);
  expect(wholeUnits(1000, "mi", RUN_MI)).toBe(1);
  expect(wholeUnits(40_000, "mi", RUN_MI)).toBe(13);
  expect(wholeUnits(4828, "km", RUN_KM)).toBe(5);
  expect(wholeUnits(20_921, "km", RUN_KM)).toBe(21);
  expect(wholeUnits(300, "km", RUN_KM)).toBe(1);
});

test("the number a text says: km as they are, miles to one decimal", () => {
  expect(unitsNumber(7500, "km")).toBe(7.5);
  expect(unitsNumber(4828, "km")).toBe(4.828);
  expect(unitsNumber(4828, "mi")).toBe(3);
  expect(unitsNumber(7242, "mi")).toBe(4.5);
  expect(unitsNumber(5000, "mi")).toBe(3.1);
  expect(nearestTenths(5000, "mi")).toBe(31);
});

test("what a word needs in miles is never said less than it is", () => {
  // 3 km for a letter are 1.864 mi, 9 km 5.59, 12 km 7.46.
  expect(milesAtLeast(3000)).toBe(1.9);
  expect(milesAtLeast(9000)).toBe(5.6);
  expect(milesAtLeast(12_000)).toBe(7.5);
  // A whole mile is itself.
  expect(milesAtLeast(1609.344)).toBe(1);
});

test("the field shows the number typed, or the other unit's to a decimal", () => {
  expect(shownNumber("7,5", "km")).toBe("7,5");
  expect(shownNumber("4,5 mi", "mi")).toBe("4,5");
  expect(shownNumber(" mi", "mi")).toBe("");
  expect(shownNumber("abc mi", "mi")).toBe("abc");
  // Written in km while the app is in miles, and the other way round.
  expect(shownNumber("5", "mi")).toBe("3.1");
  expect(shownNumber("4.828", "mi")).toBe("3");
  expect(shownNumber("1.5", "mi")).toBe("0.9");
  expect(shownNumber("3 mi", "km")).toBe("4.8");
  expect(shownNumber("abc", "mi")).toBe("abc");
});

test.each([
  ["3 mi", 1, "4 mi"],
  ["3 mi", -1, "2 mi"],
  ["4,5 mi", 1, "5,5 mi"],
  ["4.5 mi", -1, "3.5 mi"],
  ["1 mi", -1, "1 mi"],
  ["1,5 mi", -1, "1 mi"],
  ["13 mi", 1, "13 mi"],
  ["12,5 mi", 1, "13 mi"],
  ["30 mi", -1, "13 mi"],
  ["0 mi", 1, "1 mi"],
  [" mi", 1, "1 mi"],
  ["abc mi", -1, "1 mi"],
  // A text in km, stepped in miles: from the miles it shows.
  ["4.828", 1, "4 mi"],
  ["5", 1, "4.1 mi"],
  ["1.5", -1, "1 mi"],
  ["abc", 1, "1 mi"],
])("in miles %j stepped by %i is %j", (text, steps, expected) => {
  expect(steppedDistance(text, steps, "mi", RUN_MI)).toBe(expected);
});

test.each([
  ["5", 1, "6"],
  ["7,5", 1, "8,5"],
  ["7.5", -1, "6.5"],
  ["21", 1, "21"],
  ["abc", -1, "1"],
  ["7,55", 1, "1"],
])("in km %j stepped by %i is %j, as before the units", (text, steps, expected) => {
  expect(steppedDistance(text, steps, "km", RUN_KM)).toBe(expected);
});

test("a unit changed in «Settings» keeps the distance, to the whole unit", () => {
  expect(switchedDistance("5", "mi", RUN_MI)).toBe("3 mi");
  expect(switchedDistance("7,5", "mi", RUN_MI)).toBe("5 mi");
  expect(switchedDistance("21", "mi", RUN_MI)).toBe("13 mi");
  expect(switchedDistance("1", "mi", RUN_MI)).toBe("1 mi");
  expect(switchedDistance("50", "mi", RUN_MI)).toBe("13 mi");
  expect(switchedDistance("3 mi", "km", RUN_KM)).toBe("5");
  expect(switchedDistance("4,5 mi", "km", RUN_KM)).toBe("7");
  expect(switchedDistance("13 mi", "km", RUN_KM)).toBe("21");
  expect(switchedDistance("30 mi", "km", RUN_KM)).toBe("21");
  // A km the app wrote in metres while in miles: back to a whole km.
  expect(switchedDistance("4.828", "km", RUN_KM)).toBe("5");
  // What is not a number stays, to be corrected in the new unit.
  expect(switchedDistance("abc", "mi", RUN_MI)).toBe("abc mi");
  expect(switchedDistance(" mi", "km", RUN_KM)).toBe("");
});

test("the whole miles inside limits in metres", () => {
  expect(wholeMilesWithin(1000, 21_000)).toEqual([1, 13]);
  expect(wholeMilesWithin(10_000, 30_000)).toEqual([7, 18]);
  expect(wholeMilesWithin(1000, 5000)).toEqual([1, 3]);
});
