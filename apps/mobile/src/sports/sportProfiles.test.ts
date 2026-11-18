import {
  ACTIVITIES,
  CYCLING_BEST_DISTANCES,
  DISTANCE_LIMITS_M,
  INLINE_SKATING_BEST_DISTANCES,
  RUN_ACTIVITIES,
  RUNNING_BEST_DISTANCES,
  WHEELCHAIR_BEST_DISTANCES,
} from "@shaperoute/shared-types";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

import { sportPaceLabel } from "../activities/activityText";
import { metAt } from "../body/energy";
import { NETWORKS } from "../engine/zones";
import { muwLabel, muwSport } from "../feed/muwLabel";
import { DISTANCE_TYPE } from "../health/appleWorkout";
import { freeRunActivity } from "../navigation/freeSport";
import { paddlePaceLabel } from "../navigation/paddle";
import { swimPaceLabel } from "../navigation/swim";
import {
  APP_DISTANCE_LIMITS_KM,
  APP_DISTANCE_LIMITS_MI,
  distanceForSport,
  distanceStep,
} from "../route/distance";
import { ACTIVITY_LABELS } from "../search/searchFilters";
import { paceLabel } from "../units/format";
import {
  DEFAULT_ACTIVITY,
  findProfile,
  profileOf,
  SPORT_PROFILES,
  tableOf,
} from "./index";

// TASK-376 part B3 (ADR-0320): the tables of the app, read from the sports,
// are the ones written by hand before, value for value and in order, with
// the sports added since, each by a file and a line of index.ts: a hike
// (TASK-377), before the walk; an MTB ride (TASK-378) after the hike and a
// gravel ride after the walk; a skate (TASK-380) after the MTB ride, hidden
// until part B; snowshoeing (TASK-413) after the skate, hidden until part
// B; a wheelchair route (TASK-414) after snowshoeing, hidden until part B;
// a day of ski touring (TASK-415) after the days on the snow, hidden
// until part B; a paragliding flight (TASK-305) after it, hidden until part
// R2; a day of mountaineering (TASK-463) after the flight, «Soon» since part
// B until it is turned on.

const MPH_KMH = 1.609344;

it("has a profile for every activity of a saved run, in their order", () => {
  expect(SPORT_PROFILES.map((sport) => sport.activity)).toEqual([...RUN_ACTIVITIES]);
  expect(DEFAULT_ACTIVITY).toBe("running");
  expect(() => profileOf("climbing" as never)).toThrow("no sport profile for climbing");
});

it("gives «Draw» the distances of before", () => {
  expect(Object.entries(APP_DISTANCE_LIMITS_KM)).toEqual([
    ["running", [1, 21]],
    [
      "cycling",
      [DISTANCE_LIMITS_M.cycling[0] / 1000, DISTANCE_LIMITS_M.cycling[1] / 1000],
    ],
    [
      "paddling",
      [DISTANCE_LIMITS_M.paddling[0] / 1000, DISTANCE_LIMITS_M.paddling[1] / 1000],
    ],
    [
      "swimming",
      [DISTANCE_LIMITS_M.swimming[0] / 1000, DISTANCE_LIMITS_M.swimming[1] / 1000],
    ],
    ["hiking", [1, 30]],
    ["mountain_biking", [10, 30]],
    ["inline_skating", [5, 30]],
    [
      "snowshoeing",
      [
        DISTANCE_LIMITS_M.snowshoeing[0] / 1000,
        DISTANCE_LIMITS_M.snowshoeing[1] / 1000,
      ],
    ],
    [
      "wheelchair",
      [DISTANCE_LIMITS_M.wheelchair[0] / 1000, DISTANCE_LIMITS_M.wheelchair[1] / 1000],
    ],
    [
      "walking",
      [DISTANCE_LIMITS_M.walking[0] / 1000, DISTANCE_LIMITS_M.walking[1] / 1000],
    ],
    ["gravel_biking", [10, 30]],
  ]);
  expect(Object.entries(APP_DISTANCE_LIMITS_MI)).toEqual([
    ["running", [1, 13]],
    ["cycling", [7, 18]],
    ["paddling", [1, 3]],
    ["swimming", [0.5, 1.5]],
    ["hiking", [1, 18]],
    ["mountain_biking", [7, 18]],
    ["inline_skating", [4, 18]],
    ["snowshoeing", [0.5, 1.5]],
    ["wheelchair", [1, 3]],
    ["walking", [1, 18]],
    ["gravel_biking", [7, 18]],
  ]);
  expect(ACTIVITIES.map((activity) => distanceStep(activity))).toEqual([
    1, 1, 1, 0.5, 1, 1, 1, 0.5, 1, 1, 1,
  ]);
  expect(distanceForSport("7", "paddling", "km")).toBe("2");
  expect(distanceForSport("7", "swimming", "km")).toBe("1");
  expect(distanceForSport("7", "running", "km")).toBe("7");
  expect(distanceForSport("7", "walking", "km")).toBe("7");
});

it("gives Apple Health and Health Connect the numbers of before", () => {
  expect(tableOf((sport) => sport.appleWorkout)).toEqual({
    running: 37,
    cycling: 13,
    paddling: 31,
    swimming: 46,
    hiking: 24,
    mountain_biking: 13,
    // `.skatingSports` (TASK-380).
    inline_skating: 39,
    // `.hiking`: Apple has no type for it (TASK-413).
    snowshoeing: 24,
    // `.wheelchairWalkPace` (TASK-414).
    wheelchair: 70,
    walking: 52,
    gravel_biking: 13,
    skiing: 61,
    xc_skiing: 60,
    // `.crossCountrySkiing` too (TASK-415).
    ski_touring: 60,
    // `.other`: Apple has no type for it (TASK-305 parts R).
    paragliding: 3000,
    // `.climbing` (TASK-463).
    alpinism: 9,
    // `.traditionalStrengthTraining` (TASK-385).
    gym: 50,
  });
  expect(Object.entries(DISTANCE_TYPE)).toEqual([
    ["running", "HKQuantityTypeIdentifierDistanceWalkingRunning"],
    ["cycling", "HKQuantityTypeIdentifierDistanceCycling"],
    ["paddling", "HKQuantityTypeIdentifierDistancePaddleSports"],
    ["swimming", "HKQuantityTypeIdentifierDistanceSwimming"],
    ["hiking", "HKQuantityTypeIdentifierDistanceWalkingRunning"],
    ["mountain_biking", "HKQuantityTypeIdentifierDistanceCycling"],
    ["snowshoeing", "HKQuantityTypeIdentifierDistanceWalkingRunning"],
    ["walking", "HKQuantityTypeIdentifierDistanceWalkingRunning"],
    ["gravel_biking", "HKQuantityTypeIdentifierDistanceCycling"],
  ]);
  expect(tableOf((sport) => sport.healthConnect)).toEqual({
    running: 56,
    cycling: 8,
    paddling: 46,
    swimming: 73,
    hiking: 37,
    mountain_biking: 8,
    // EXERCISE_TYPE_SKATING (TASK-380).
    inline_skating: 60,
    // EXERCISE_TYPE_SNOWSHOEING (TASK-413).
    snowshoeing: 63,
    // EXERCISE_TYPE_WHEELCHAIR (TASK-414).
    wheelchair: 82,
    walking: 79,
    gravel_biking: 8,
    skiing: 61,
    xc_skiing: 61,
    // EXERCISE_TYPE_SKIING too (TASK-415).
    ski_touring: 61,
    // EXERCISE_TYPE_PARAGLIDING (TASK-305 parts R).
    paragliding: 47,
    // EXERCISE_TYPE_ROCK_CLIMBING: no mountaineering there (TASK-463).
    alpinism: 51,
    // EXERCISE_TYPE_STRENGTH_TRAINING (TASK-385).
    gym: 70,
  });
});

it("names the sports, and draws on the phone the ones of before", () => {
  expect(Object.entries(ACTIVITY_LABELS)).toEqual([
    ["running", "Run"],
    ["cycling", "Bike"],
    ["paddling", "Paddle"],
    ["swimming", "Swim"],
    ["hiking", "Hike"],
    ["mountain_biking", "MTB"],
    ["inline_skating", "Roller"],
    ["snowshoeing", "Snowshoes"],
    ["wheelchair", "Wheelchair & stroller"],
    ["walking", "Walk"],
    ["gravel_biking", "Gravel"],
  ]);
  expect(Object.entries(NETWORKS)).toEqual([
    ["running", "foot"],
    ["cycling", "bike"],
    ["walking", "foot"],
  ]);
});

it("counts the energy as before", () => {
  expect(tableOf((sport) => sport.energy?.kind)).toEqual({
    running: "oxygen",
    cycling: "met",
    paddling: "met",
    hiking: "oxygen",
    // A gravel and an MTB ride (TASK-378 part B), the Compendium's bicycling.
    mountain_biking: "met",
    // A skate (TASK-380 part B), the Compendium's in-line skating.
    inline_skating: "met",
    walking: "oxygen",
    gravel_biking: "met",
    // Every activity its calories (TASK-424 part C2, the user's choice of
    // 2026-11-10): the swim in open water and the days on the snow too.
    swimming: "met",
    skiing: "met",
    xc_skiing: "met",
    ski_touring: "oxygen",
    // A flight: the Compendium's hang gliding (TASK-305 parts R).
    paragliding: "met",
    // A day of mountaineering as a hike, as ski touring (TASK-463).
    alpinism: "oxygen",
    // Snowshoeing as a hike (TASK-413).
    snowshoeing: "oxygen",
    // A wheelchair route as a walk until part B (TASK-414).
    wheelchair: "oxygen",
  });
  expect(profileOf("hiking").energy).toEqual(profileOf("walking").energy);
  expect(profileOf("snowshoeing").energy).toEqual(profileOf("hiking").energy);
  expect(profileOf("wheelchair").energy).toEqual(profileOf("walking").energy);
  expect(profileOf("running").energy).toEqual({
    kind: "oxygen",
    mlKgPerM: 0.2,
    mlKgPerMUp: 0.9,
  });
  expect(profileOf("walking").energy).toEqual({
    kind: "oxygen",
    mlKgPerM: 0.1,
    mlKgPerMUp: 1.8,
  });
  expect(profileOf("cycling").energy).toEqual({
    kind: "met",
    bands: [
      { belowKmh: 10 * MPH_KMH, met: 4.0 },
      { belowKmh: 12 * MPH_KMH, met: 6.8 },
      { belowKmh: 14 * MPH_KMH, met: 8.0 },
      { belowKmh: 16 * MPH_KMH, met: 10.0 },
      { belowKmh: 20 * MPH_KMH, met: 12.0 },
      { belowKmh: Infinity, met: 15.8 },
    ],
  });
  expect(profileOf("paddling").energy).toEqual({
    kind: "met",
    bands: [
      { belowKmh: 4 * MPH_KMH, met: 2.8 },
      { belowKmh: 6 * MPH_KMH, met: 5.8 },
      { belowKmh: Infinity, met: 12.5 },
    ],
  });
  expect(metAt("paddling", 100)).toBe(12.5);
});

it("gives every activity its energy (TASK-424 part C2)", () => {
  // Only the gym has none here: it counts its own, from its sets.
  expect(
    SPORT_PROFILES.filter((sport) => sport.energy === undefined).map(
      (sport) => sport.activity,
    ),
  ).toEqual(["gym"]);
  // A swim in open water: a pool's bands, its paces /100 m in km/h.
  expect(profileOf("swimming").energy).toEqual({
    kind: "met",
    bands: [
      { belowKmh: 360 / 138, met: 5.8 },
      { belowKmh: 360 / 105, met: 8.0 },
      { belowKmh: 360 / 73, met: 10.5 },
      { belowKmh: Infinity, met: 14.5 },
    ],
  });
  // Downhill: one MET, on the descents alone (activities/trackEffort.ts).
  expect(profileOf("skiing").energy).toEqual({
    kind: "met",
    bands: [{ belowKmh: Infinity, met: 5.3 }],
  });
  expect(profileOf("xc_skiing").energy).toEqual({
    kind: "met",
    bands: [
      { belowKmh: 4 * MPH_KMH, met: 6.8 },
      { belowKmh: 5 * MPH_KMH, met: 9.0 },
      { belowKmh: 8 * MPH_KMH, met: 12.5 },
      { belowKmh: Infinity, met: 15.0 },
    ],
  });
  // Up on skins: a hike's, the metres climbed most of all.
  expect(profileOf("ski_touring").energy).toEqual(profileOf("hiking").energy);
  // Up a mountain: a hike's too (TASK-463).
  expect(profileOf("alpinism").energy).toEqual(profileOf("hiking").energy);
  // In the air: hang gliding, 3.5 at any speed.
  expect(profileOf("paragliding").energy).toEqual({
    kind: "met",
    bands: [{ belowKmh: Infinity, met: 3.5 }],
  });
});

it("starts a run without a route and labels a MuW route as before", () => {
  expect(RUN_ACTIVITIES.map(freeRunActivity)).toEqual([
    undefined,
    "cycling",
    "paddling",
    "swimming",
    "hiking",
    "mountain_biking",
    "inline_skating",
    "snowshoeing",
    "wheelchair",
    "walking",
    "gravel_biking",
    "cycling",
    undefined,
    undefined,
    // A flight as a ride, in km/h, until part R2 (TASK-305).
    "cycling",
    // A day of mountaineering with a hike's numbers (TASK-463).
    "hiking",
    undefined,
  ]);
  expect(muwLabel("running")).toBe("Route created by MuW – run it yourself");
  expect(muwLabel("paddling")).toBe("Route created by MuW – paddle it yourself");
  for (const activity of ["cycling", "walking", "swimming", "skiing", "hiking"]) {
    expect(muwLabel(activity)).toBe("Route created by MuW – ride it yourself");
  }
});

it("keeps the sport files free of screens and of each other", () => {
  // A sport file reads the contract, the texts and the profile's type: a
  // new sport is a file of its own and one line in index.ts.
  const folder = __dirname;
  for (const name of readdirSync(folder)) {
    if (name === "index.ts" || name.endsWith(".test.ts")) {
      continue;
    }
    const source = readFileSync(join(folder, name), "utf8");
    const from = [...source.matchAll(/from "([^"]+)"/g)].map((match) => match[1]);
    for (const path of from) {
      expect([
        "@shaperoute/shared-types",
        "@kingstinct/react-native-healthkit",
        "../i18n",
        "../units/distanceInput",
        "./base",
      ]).toContain(path);
    }
  }
});

it("gives the screens what they told apart before (part B3b)", () => {
  expect(tableOf((sport) => sport.emoji)).toEqual({
    running: "🏃‍♂️",
    cycling: "🚴",
    paddling: "🛶",
    swimming: "🏊",
    hiking: "⛰️",
    mountain_biking: "🚵",
    inline_skating: "🛼",
    snowshoeing: "❄️",
    wheelchair: "♿",
    walking: "🚶",
    gravel_biking: "🚲",
    skiing: "⛷️",
    xc_skiing: "🎿",
    ski_touring: "🏔️",
    paragliding: "🪂",
    alpinism: "🧗",
    gym: "🏋️",
  });
  expect(tableOf((sport) => sport.pace)).toEqual({
    paddling: "paddle",
    swimming: "swim",
  });
  expect(tableOf((sport) => sport.onWater)).toEqual({ paddling: true, swimming: true });
  expect(tableOf((sport) => sport.noWords)).toEqual({
    paddling: true,
    swimming: true,
    // A shape of the catalogue only on the snow (TASK-413).
    snowshoeing: true,
    // A circle, a heart, a star or a moon only (TASK-414).
    wheelchair: true,
  });
  expect(tableOf((sport) => sport.noImages)).toEqual({
    paddling: true,
    snowshoeing: true,
    wheelchair: true,
  });
  expect(tableOf((sport) => sport.drawNote)).toEqual({
    paddling: "On the water, the drawing goes where it fits near the start.",
  });
  expect(tableOf((sport) => sport.laps)).toEqual({ swimming: true });
  expect(tableOf((sport) => sport.timeAt)).toEqual({
    running: "runner",
    hiking: "walker",
    // A skate at the skater's pace (TASK-380 part B).
    inline_skating: "skater",
    walking: "walker",
    // A wheelchair or a stroller at a walker's pace (TASK-414 part B).
    wheelchair: "walker",
  });
  expect(tableOf((sport) => sport.skied)).toEqual({ skiing: true });
  expect(tableOf((sport) => sport.bests)).toEqual({
    running: { distances: RUNNING_BEST_DISTANCES, named: "race" },
    cycling: { distances: CYCLING_BEST_DISTANCES, named: "km" },
    // A ride's, kept apart from a ride's (TASK-378).
    mountain_biking: { distances: CYCLING_BEST_DISTANCES, named: "km" },
    gravel_biking: { distances: CYCLING_BEST_DISTANCES, named: "km" },
    // A run's races, kept apart from a run's (TASK-380).
    inline_skating: { distances: INLINE_SKATING_BEST_DISTANCES, named: "race" },
    // 1 and 5 km, its own (TASK-414, the user's choice 7).
    wheelchair: { distances: WHEELCHAIR_BEST_DISTANCES, named: "km" },
  });
  expect(tableOf((sport) => sport.partsBetween?.km)).toEqual({
    running: "{drawn} km of drawing + {between} km walking between the parts",
    cycling: "{drawn} km of drawing + {between} km riding between the parts",
    paddling: "{drawn} km of drawing + {between} km paddling between the parts",
    swimming: "{drawn} km of drawing + {between} km swimming between the parts",
    mountain_biking: "{drawn} km of drawing + {between} km riding between the parts",
    gravel_biking: "{drawn} km of drawing + {between} km riding between the parts",
  });
  expect(tableOf((sport) => sport.lettersBetween?.mi)).toEqual({
    running: "{letters} mi of letters + {between} mi walking between them",
    cycling: "{letters} mi of letters + {between} mi riding between them",
    mountain_biking: "{letters} mi of letters + {between} mi riding between them",
    gravel_biking: "{letters} mi of letters + {between} mi riding between them",
  });
  expect(findProfile("climbing")).toBeUndefined();
  expect(findProfile(undefined)).toBeUndefined();
});

it("writes a pace and shows a MuW route's sport as before", () => {
  // 5 km in 25 minutes.
  const ms = 25 * 60_000;
  expect(sportPaceLabel("paddling", 5000, ms)).toBe(paddlePaceLabel(5000, ms));
  expect(sportPaceLabel("swimming", 5000, ms)).toBe(swimPaceLabel(5000, ms));
  for (const activity of [
    "running",
    "cycling",
    "walking",
    "skiing",
    "hiking",
    undefined,
  ]) {
    expect(sportPaceLabel(activity, 5000, ms)).toBe(paceLabel(5000, ms));
  }
  expect(
    ["running", "paddling", "cycling", "walking", "swimming"].map(
      (a) => muwSport(a).activity,
    ),
  ).toEqual(["running", "paddling", "cycling", "cycling", "cycling"]);
});
