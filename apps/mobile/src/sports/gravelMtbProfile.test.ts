/**
 * «Gravel» 🚲 and «MTB» 🚵 in the app (TASK-378 part B, ADR-0322): their
 * rows in «Settings», «Soon» until the user turns them on; offered in the
 * search and the form to publish once ready; the caution under an MTB
 * route; the energy of the Compendium; the files of other apps that say a
 * gravel or an MTB ride.
 */
import { readFileSync } from "fs";
import { join } from "path";

import type { BodyProfile } from "../body/bodyProfile";
import { activeKcal, type Effort } from "../body/energy";
import { sportOfWord } from "../imports/fileTrack";
import { readFit } from "../imports/fit";
import { withoutRouteIcon } from "../screens/RunNoRouteButton";
import { SEARCH_ACTIVITIES } from "../search/searchFilters";
import {
  activityOf,
  activityOffered,
  ALL_SPORTS,
  canChoose,
  runActivityOf,
  type SportOption,
  withoutRouteLabel,
} from "../settings/sport";
import { profileOf } from "./index";

jest.mock("expo-file-system");

test("«Gravel» 🚲 and «MTB» 🚵 come after «Hike», «Soon» until turned on", () => {
  const index = ALL_SPORTS.findIndex((option) => option.id === "gravel");
  expect(ALL_SPORTS[index - 1]?.id).toBe("hike");
  expect(ALL_SPORTS.slice(index, index + 2)).toEqual([
    { id: "gravel", emoji: "🚲", name: "Gravel", ready: false },
    { id: "mtb", emoji: "🚵", name: "MTB", ready: false },
  ]);
  expect(canChoose("gravel", ALL_SPORTS)).toBe(false);
  expect(canChoose("mtb", ALL_SPORTS)).toBe(false);
  // Asked, and saved, as themselves; out with the ride's words.
  expect(activityOf("gravel")).toBe("gravel_biking");
  expect(runActivityOf("gravel")).toBe("gravel_biking");
  expect(activityOf("mtb")).toBe("mountain_biking");
  expect(runActivityOf("mtb")).toBe("mountain_biking");
  expect(withoutRouteLabel("gravel")).toBe("Ride without a route");
  expect(withoutRouteLabel("mtb")).toBe("Ride without a route");
  expect(withoutRouteIcon("gravel")).toBe("🚲");
  expect(withoutRouteIcon("mtb")).toBe("🚵");
});

test("a gravel or an MTB ride is offered to search and publish only once ready", () => {
  expect(activityOffered("gravel_biking")).toBe(false);
  expect(activityOffered("mountain_biking")).toBe(false);
  expect(SEARCH_ACTIVITIES).not.toContain("gravel_biking");
  expect(SEARCH_ACTIVITIES).not.toContain("mountain_biking");
  const ready: SportOption[] = ALL_SPORTS.map((option) =>
    option.id === "gravel" || option.id === "mtb" ? { ...option, ready: true } : option,
  );
  expect(activityOffered("gravel_biking", ready)).toBe(true);
  expect(activityOffered("mountain_biking", ready)).toBe(true);
  // Each keeps to its own row.
  const gravelOnly = ALL_SPORTS.map((option) =>
    option.id === "gravel" ? { ...option, ready: true } : option,
  );
  expect(activityOffered("mountain_biking", gravelOnly)).toBe(false);
  expect(activityOffered("cycling")).toBe(true);
});

test("an MTB route says its trails can be technical; a gravel ride's does not", () => {
  expect(profileOf("mountain_biking").caution).toBe(
    "Trails can be technical: check the route before you set off.",
  );
  expect(profileOf("gravel_biking").caution).toBeUndefined();
  expect(profileOf("cycling").caution).toBeUndefined();
});

const MAN: BodyProfile = { sex: "male", weightKg: 80, heightCm: 180, birthYear: 1990 };

function kcal(activity: Effort["activity"], kmh: number): number {
  // An hour at `kmh`.
  return activeKcal(
    { activity, metres: kmh * 1000, seconds: 3600, climbM: 0 },
    MAN,
    2026,
  );
}

test("their energy is the Compendium's bicycling, an MTB ride's «mountain, general»", () => {
  expect(profileOf("gravel_biking").energy).toEqual(profileOf("cycling").energy);
  expect(kcal("gravel_biking", 25)).toBe(kcal("cycling", 25));
  // 01009, 8.5 MET at any speed.
  expect(profileOf("mountain_biking").energy).toEqual({
    kind: "met",
    bands: [{ belowKmh: Infinity, met: 8.5 }],
  });
  expect(kcal("mountain_biking", 8)).toBe(kcal("mountain_biking", 30));
  expect(kcal("mountain_biking", 12)).toBeGreaterThan(0);
});

test("their numbers in Health are a ride's: Apple .cycling, Health Connect BIKING", () => {
  for (const activity of ["gravel_biking", "mountain_biking"] as const) {
    const profile = profileOf(activity);
    expect(profile.appleWorkout).toBe(13);
    expect(profile.appleDistance).toBe("HKQuantityTypeIdentifierDistanceCycling");
    expect(profile.healthConnect).toBe(8);
  }
});

test("Garmin's and Strava's words for a gravel and an MTB ride are theirs", () => {
  expect(sportOfWord("gravel_cycling")).toBe("gravel_biking");
  expect(sportOfWord("GravelRide")).toBe("gravel_biking");
  expect(sportOfWord("mountain_biking")).toBe("mountain_biking");
  expect(sportOfWord("MountainBikeRide")).toBe("mountain_biking");
  expect(sportOfWord("MTB")).toBe("mountain_biking");
  // The rest as before, a climb on foot never a ride.
  expect(sportOfWord("cycling")).toBe("cycling");
  expect(sportOfWord("Biking")).toBe("cycling");
  expect(sportOfWord("mountaineering")).toBeNull();
});

/** The run of the Garmin watch (make_fixtures.mjs), its session's sport and
 * sub-sport made `sport` and `subSport`. The session is the last message,
 * 19 bytes, before the 2 of the CRC; its sport is the ninth of them, its
 * sub-sport the tenth. */
function garminSession(sport: number, subSport: number) {
  const bytes = new Uint8Array(
    readFileSync(join(__dirname, "../../__tests__/fixtures/imports/garmin-run.fit")),
  );
  const at = bytes.length - 2 - 19 + 9;
  expect(bytes[at]).toBe(1);
  bytes[at] = sport;
  bytes[at + 1] = subSport;
  return readFit(bytes);
}

test("a FIT ride's sub-sport says a gravel or an MTB ride", () => {
  expect(garminSession(2, 46).sport).toBe("gravel_biking");
  expect(garminSession(2, 8).sport).toBe("mountain_biking");
  // e_bike_mountain.
  expect(garminSession(2, 47).sport).toBe("mountain_biking");
  // Road, generic and invalid are a ride; the sub-sport says nothing of a run.
  expect(garminSession(2, 7).sport).toBe("cycling");
  expect(garminSession(2, 0).sport).toBe("cycling");
  expect(garminSession(2, 0xff).sport).toBe("cycling");
  expect(garminSession(1, 8).sport).toBe("running");
});
