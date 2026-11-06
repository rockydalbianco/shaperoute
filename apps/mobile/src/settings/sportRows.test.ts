import { ACTIVITIES, RECORD_ACTIVITIES } from "@shaperoute/shared-types";

import { profileOf } from "../sports";
import { activityOf, ALL_SPORTS, runActivityOf, type Sport } from "./sport";

// TASK-376 part B3c (ADR-0320): «Settings» reads emoji, name and «Record
// only» from the sports' profiles, the same rows and activities as before.

it("shows the rows of before, in their order", () => {
  expect(ALL_SPORTS).toEqual([
    { id: "run", emoji: "🏃‍♂️", name: "Run", ready: true },
    { id: "bike", emoji: "🚴", name: "Bike", ready: true },
    { id: "paddle", emoji: "🛶", name: "Paddle", ready: true },
    { id: "swim", emoji: "🏊", name: "Swim", ready: true },
    { id: "walk", emoji: "🚶", name: "Walk", ready: false },
    // Added since: the hike (TASK-377 part B), on since the server hikes.
    { id: "hike", emoji: "⛰️", name: "Hike", ready: true },
    // The gravel and the MTB ride (TASK-378 part B), on since part C.
    { id: "gravel", emoji: "🚲", name: "Gravel", ready: true },
    { id: "mtb", emoji: "🚵", name: "MTB", ready: true },
    { id: "ski", emoji: "⛷️", name: "Ski", ready: true, recordOnly: true },
    {
      id: "xc_ski",
      emoji: "🎿",
      name: "Cross-country ski",
      ready: false,
      recordOnly: true,
    },
    { id: "gym", emoji: "🏋️", name: "Gym", ready: true },
    { id: "paragliding", emoji: "🪂", name: "Paragliding", ready: false },
  ]);
  // Only the rows that say it carry «Record only».
  expect(
    ALL_SPORTS.filter((option) => "recordOnly" in option).map((o) => o.id),
  ).toEqual(["ski", "xc_ski"]);
});

it("asks and saves the activities of before", () => {
  const every: Sport[] = ALL_SPORTS.map((option) => option.id);
  expect(every.map(activityOf)).toEqual([
    "running",
    "cycling",
    "paddling",
    "swimming",
    "walking",
    "hiking",
    "gravel_biking",
    "mountain_biking",
    "running",
    "running",
    "running",
    "running",
  ]);
  expect(every.map(runActivityOf)).toEqual([
    "running",
    "cycling",
    "paddling",
    "swimming",
    "walking",
    "hiking",
    "gravel_biking",
    "mountain_biking",
    "skiing",
    "xc_skiing",
    "gym",
    "running",
  ]);
  for (const sport of every) {
    expect(ACTIVITIES).toContain(activityOf(sport));
  }
});

it("takes emoji and name from the profile of the sport's activity", () => {
  for (const option of ALL_SPORTS.filter((o) => o.id !== "paragliding")) {
    const activity = runActivityOf(option.id);
    const profile = profileOf(activity);
    expect([option.emoji, option.name]).toEqual([profile.emoji, profile.name]);
    expect(option.recordOnly === true).toBe(
      (RECORD_ACTIVITIES as readonly string[]).includes(activity),
    );
  }
});
