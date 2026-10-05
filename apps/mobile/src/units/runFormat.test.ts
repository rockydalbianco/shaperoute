import { kmNumber } from "../navigation/freeRun";
import { distanceLabel, roundMetres } from "../navigation/phrases";
import { METRES_PER_FOOT, METRES_PER_MILE, shortDistanceLabel } from "./format";
import {
  milesBannerLabel,
  paceUnit,
  perUnitS,
  roundFeet,
  runDistanceNumber,
  speedIn,
  speedUnit,
} from "./runFormat";

/**
 * What a run writes in the app's units (TASK-182, part C). In kilometres,
 * what the run's screens wrote before.
 */

test("the distance of a run, without its unit: kilometres as before, or miles", () => {
  for (const metres of [0, -3, 4, 995, 1005, 4012, 12_340, 21_097.5]) {
    expect(runDistanceNumber(metres, "km")).toBe(kmNumber(metres));
    // With no unit given, the app's: kilometres, in a test.
    expect(runDistanceNumber(metres)).toBe(kmNumber(metres));
  }
  expect(runDistanceNumber(0, "mi")).toBe("0.00");
  expect(runDistanceNumber(-3, "mi")).toBe("0.00");
  expect(runDistanceNumber(METRES_PER_MILE, "mi")).toBe("1.00");
  expect(runDistanceNumber(5000, "mi")).toBe("3.11");
  expect(runDistanceNumber(21_097.5, "mi")).toBe("13.11");
});

test("a pace for a kilometre becomes a pace for a mile", () => {
  expect(perUnitS(300, "km")).toBe(300);
  expect(perUnitS(300)).toBe(300);
  // 5:00 /km is 8:03 /mi.
  expect(perUnitS(300, "mi")).toBeCloseTo(482.8, 1);
  expect(perUnitS(360, "mi")).toBeCloseTo(579.36, 2);
});

test("the units written beside a pace and a speed", () => {
  expect(paceUnit("km")).toBe("/km");
  expect(paceUnit("mi")).toBe("/mi");
  expect(speedUnit("km")).toBe("km/h");
  expect(speedUnit("mi")).toBe("mph");
});

test("a speed in km/h or in mph", () => {
  // 10 km in half an hour.
  expect(speedIn(10_000, 30 * 60_000, "km")).toBeCloseTo(20, 9);
  expect(speedIn(10_000, 30 * 60_000, "mi")).toBeCloseTo(12.427, 3);
  // Five miles in twenty minutes.
  expect(speedIn(5 * METRES_PER_MILE, 20 * 60_000, "mi")).toBeCloseTo(15, 9);
  expect(speedIn(1000, 0, "mi")).toBe(0);
});

test("feet are said to the nearest fifty, and never none", () => {
  // Where a turn is said: 50 m on foot, 100 m on a bike.
  expect(roundFeet(50)).toBe(150);
  expect(roundFeet(100)).toBe(350);
  expect(roundFeet(45)).toBe(150);
  expect(roundFeet(30)).toBe(100);
  expect(roundFeet(200)).toBe(650);
  // Halfway goes up: 75 ft.
  expect(roundFeet(75 * METRES_PER_FOOT + 0.01)).toBe(100);
  expect(roundFeet(74 * METRES_PER_FOOT)).toBe(50);
  expect(roundFeet(5)).toBe(50);
  expect(roundFeet(0)).toBe(50);
  // As the app writes a short distance (part A).
  for (const metres of [10, 50, 100, 137, 200, 290]) {
    expect(`${roundFeet(metres)} ft`).toBe(shortDistanceLabel(metres, "mi"));
  }
});

test("the banner of a turn with miles: feet, and miles from a thousand feet", () => {
  expect(milesBannerLabel(0)).toBe("50 ft");
  expect(milesBannerLabel(50)).toBe("150 ft");
  expect(milesBannerLabel(120)).toBe("400 ft");
  expect(milesBannerLabel(300)).toBe("1000 ft");
  // A thousand feet are 304.8 m.
  expect(milesBannerLabel(305)).toBe("0.2 mi");
  expect(milesBannerLabel(1400)).toBe("0.9 mi");
  expect(milesBannerLabel(METRES_PER_MILE)).toBe("1.0 mi");
  expect(milesBannerLabel(5000)).toBe("3.1 mi");
});

test("the banner's distance follows the units, and in kilometres is as before", () => {
  // As before TASK-182, written out.
  expect(distanceLabel(4, "km")).toBe("10 m");
  expect(distanceLabel(120, "km")).toBe("120 m");
  expect(distanceLabel(996, "km")).toBe("1000 m");
  expect(distanceLabel(1000, "km")).toBe("1.0 km");
  expect(distanceLabel(1400, "km")).toBe("1.4 km");
  for (const metres of [0, 4, 55, 120, 996, 999]) {
    expect(distanceLabel(metres, "km")).toBe(`${roundMetres(metres)} m`);
    // With no unit given, the app's: kilometres, in a test.
    expect(distanceLabel(metres)).toBe(distanceLabel(metres, "km"));
  }
  expect(distanceLabel(3200)).toBe("3.2 km");
  expect(distanceLabel(120, "mi")).toBe("400 ft");
  expect(distanceLabel(3200, "mi")).toBe("2.0 mi");
});
