import type { Activity, LatLon } from "@shaperoute/shared-types";

import { SPORT_PROFILES } from "../sports";
import { comparisonOf } from "./kmCompare";
import { ANNOUNCE_M } from "./navigator";
import { announceMOf, isRide, RIDE_ANNOUNCE_M, saidKmOf } from "./ride";
import type { Track } from "./trackRecorder";

/**
 * Gravel, MTB and Roller record with a bike's numbers (TASK-416): speeds in
 * km/h, the kilometres said every 10, the turns said 100 m ahead. A run, a
 * walk and a hike keep a run's.
 */

const START: LatLon = [46.0122, 11.2986];
const METRE = 1 / 111_195;

function track(metres: number, seconds: number): Track {
  return {
    fixes: [
      { point: START, timeMs: 0, accuracyM: 5 },
      {
        point: [START[0] + metres * METRE, START[1]],
        timeMs: seconds * 1000,
        accuracyM: 5,
      },
    ],
    distanceM: metres,
  };
}

const RIDDEN: readonly Activity[] = [
  "cycling",
  "gravel_biking",
  "mountain_biking",
  "inline_skating",
];
const ON_FOOT: readonly Activity[] = ["running", "walking", "hiking"];

test("the bike, gravel, MTB and Roller are ridden; a run, a walk and a hike not", () => {
  for (const activity of RIDDEN) {
    expect(isRide(activity)).toBe(true);
  }
  for (const activity of ON_FOOT) {
    expect(isRide(activity)).toBe(false);
  }
  expect(isRide(undefined)).toBe(false);
  expect(isRide("a_sport_newer_than_the_app" as Activity)).toBe(false);
});

test("only the profiles that say rides are ridden", () => {
  expect(
    SPORT_PROFILES.filter((sport) => sport.rides).map((sport) => sport.activity),
  ).toEqual(["cycling", "mountain_biking", "inline_skating", "gravel_biking"]);
});

test("ridden, a turn is said 100 m ahead; on foot 50 m", () => {
  for (const activity of RIDDEN) {
    expect(announceMOf(activity)).toBe(RIDE_ANNOUNCE_M);
  }
  for (const activity of ON_FOOT) {
    expect(announceMOf(activity)).toBe(ANNOUNCE_M);
  }
});

test("ridden, the kilometres are said every 10; on foot each one", () => {
  for (const activity of RIDDEN) {
    expect(saidKmOf(track(9999, 1500), activity, "km")).toBe(0);
    expect(saidKmOf(track(19_999, 3000), activity, "km")).toBe(10);
    expect(saidKmOf(track(20_000, 3000), activity, "km")).toBe(20);
  }
  for (const activity of ON_FOOT) {
    expect(saidKmOf(track(9999, 3000), activity, "km")).toBe(9);
    expect(saidKmOf(track(19_999, 6000), activity, "km")).toBe(19);
  }
});

test("ridden, a single kilometre is not compared: the splits are a ride's", () => {
  for (const activity of RIDDEN) {
    expect(comparisonOf(2, track(2100, 600), activity, "en", "km")).toBeNull();
  }
});
