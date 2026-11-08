/**
 * «Roller» 🛼 in the app (TASK-380 part B, ADR-0324): its row in «Settings»,
 * on since the server has part A; offered in the search and the form to
 * publish while ready; the caution under its routes; the energy of the
 * Compendium; the time at the skater's pace; the files of other apps that
 * say a skate.
 */
import { readFileSync } from "fs";
import { join } from "path";

import type { BodyProfile } from "../body/bodyProfile";
import { activeKcal } from "../body/energy";
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

test("«Roller» 🛼 comes after «MTB», on since the server has part A", () => {
  const index = ALL_SPORTS.findIndex((option) => option.id === "roller");
  expect(ALL_SPORTS[index - 1]?.id).toBe("mtb");
  expect(ALL_SPORTS[index]).toEqual({
    id: "roller",
    emoji: "🛼",
    name: "Roller",
    ready: true,
  });
  expect(canChoose("roller", ALL_SPORTS)).toBe(true);
  // Asked, and saved, as itself; out with its own words.
  expect(activityOf("roller")).toBe("inline_skating");
  expect(runActivityOf("roller")).toBe("inline_skating");
  expect(withoutRouteLabel("roller")).toBe("Skate without a route");
  expect(withoutRouteIcon("roller")).toBe("🛼");
});

test("a skate is offered to search and publish while ready", () => {
  expect(activityOffered("inline_skating")).toBe(true);
  expect(SEARCH_ACTIVITIES).toContain("inline_skating");
  const soon: SportOption[] = ALL_SPORTS.map((option) =>
    option.id === "roller" ? { ...option, ready: false } : option,
  );
  expect(activityOffered("inline_skating", soon)).toBe(false);
  expect(activityOffered("cycling")).toBe(true);
});

test("a Roller route says to watch for traffic and steep descents", () => {
  expect(profileOf("inline_skating").caution).toBe(
    "Watch for traffic and steep descents: check the route before you set off.",
  );
});

test("its time is at the skater's pace; its bests a run's races", () => {
  expect(profileOf("inline_skating").timeAt).toBe("skater");
  expect(profileOf("inline_skating").bests).toEqual({
    distances: ["5k", "10k", "half", "marathon"],
    named: "race",
  });
});

const MAN: BodyProfile = { sex: "male", weightKg: 80, heightCm: 180, birthYear: 1990 };

function kcal(kmh: number): number {
  // An hour at `kmh`.
  return activeKcal(
    { activity: "inline_skating", metres: kmh * 1000, seconds: 3600, climbM: 0 },
    MAN,
    2026,
  );
}

test("its energy is the Compendium's in-line skating, faster harder", () => {
  expect(profileOf("inline_skating").energy).toEqual({
    kind: "met",
    bands: [
      { belowKmh: 16, met: 7.5 },
      { belowKmh: 19.5, met: 9.8 },
      { belowKmh: 23, met: 12.3 },
      { belowKmh: Infinity, met: 15.5 },
    ],
  });
  expect(kcal(14)).toBeGreaterThan(0);
  expect(kcal(14)).toBe(kcal(15));
  expect(kcal(18)).toBeGreaterThan(kcal(15));
  expect(kcal(21)).toBeGreaterThan(kcal(18));
  expect(kcal(25)).toBeGreaterThan(kcal(21));
});

test("its numbers in Health: Apple .skatingSports, Health Connect SKATING", () => {
  const profile = profileOf("inline_skating");
  expect(profile.appleWorkout).toBe(39);
  // Apple Health counts no distance of skating a day.
  expect(profile.appleDistance).toBeUndefined();
  expect(profile.healthConnect).toBe(60);
});

test("Garmin's, Strava's and MuW's words for a skate are its own", () => {
  expect(sportOfWord("inline_skating")).toBe("inline_skating");
  expect(sportOfWord("InlineSkate")).toBe("inline_skating");
  expect(sportOfWord("Inline Skating")).toBe("inline_skating");
  expect(sportOfWord("rollerblading")).toBe("inline_skating");
  expect(sportOfWord("6")).toBe("inline_skating");
  // Not on ice, nor on roller skis.
  expect(sportOfWord("IceSkate")).toBeNull();
  expect(sportOfWord("RollerSki")).toBeNull();
  expect(sportOfWord("running")).toBe("running");
});

/** The run of the Garmin watch (make_fixtures.mjs), its session's sport
 * made `sport`. The session is the last message, 19 bytes, before the 2 of
 * the CRC; its sport is the ninth of them. */
function garminSession(sport: number) {
  const bytes = new Uint8Array(
    readFileSync(join(__dirname, "../../__tests__/fixtures/imports/garmin-run.fit")),
  );
  const at = bytes.length - 2 - 19 + 9;
  expect(bytes[at]).toBe(1);
  bytes[at] = sport;
  return readFit(bytes);
}

test("a FIT file of sport 30 is a skate", () => {
  expect(garminSession(30).sport).toBe("inline_skating");
  expect(garminSession(33).sport).toBeNull(); // ice_skating
  expect(garminSession(1).sport).toBe("running");
});
