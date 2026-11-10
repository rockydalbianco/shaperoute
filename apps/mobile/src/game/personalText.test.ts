import personal from "@shaperoute/shared-types/fixtures/game-personal.json";
import type { GamePersonal, GamePersonalStanding } from "@shaperoute/shared-types";

import { saveLanguageChoice } from "../i18n/language";
import {
  amountText,
  challengeName,
  challengeWhat,
  medalName,
  periodLeftText,
  periodText,
  standingText,
  stepShares,
  streakRuleText,
  streakText,
  tiersText,
} from "./personalText";

// The phone's documents folder, in memory: the language.
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, Paths: { document: { uri: "file:///documents/" } } };
});

afterEach(() => {
  saveLanguageChoice("phone");
});

const PERSONAL = personal as GamePersonal;
const [LONG_OUTINGS, , LONG_RUN] = PERSONAL.week.challenges;

const WEEK_KM: GamePersonalStanding = {
  id: "week_km",
  unit: "m",
  tiers: [10_000, 20_000, 40_000],
  value: 14_500,
  tier: 1,
};
const PACE_5K: GamePersonalStanding = {
  id: "pace_5k",
  unit: "pace_s",
  tiers: [420, 360, 300],
  value: 380,
  tier: 1,
};

/** Noon on a day, on the phone's clock. */
const noon = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day, 12).getTime();

test("every challenge of the API has its name and what counts", () => {
  const ids = [
    "week_km",
    "week_days",
    "week_long_outings",
    "early",
    "weekend_km",
    "evening",
    "pace_5k",
    "long_run",
    "fast_1k",
    "pace_10k",
    "double_5k",
    "month_km",
    "month_long",
    "month_days",
    "month_early",
  ];
  for (const id of ids) {
    expect(challengeName(id)).not.toBe(id);
    expect(challengeWhat(id, "km")).not.toBe("");
  }
  // One the app does not know yet: its id, and nothing more.
  expect(challengeName("week_swim")).toBe("week_swim");
  expect(challengeWhat("week_swim", "km")).toBe("");
});

test("what counts, in the app's units", () => {
  expect(challengeWhat("week_long_outings", "km")).toBe("Outings of 3 km or more");
  expect(challengeWhat("week_long_outings", "mi")).toBe("Outings of 1.9 mi or more");
  expect(challengeWhat("pace_5k", "km")).toBe("5 km in one run, under the pace");
  expect(challengeWhat("double_5k", "km")).toBe("Runs of 5 km or more");
  expect(challengeWhat("early", "km")).toBe("Outings started before 8 am");
});

test("the three steps, each in its unit", () => {
  expect(tiersText(WEEK_KM, "km")).toBe("10 km · 20 km · 40 km");
  expect(tiersText(LONG_OUTINGS, "km")).toBe("2 · 3 · 5");
  expect(tiersText(PACE_5K, "km")).toBe("7:00 /km · 6:00 /km · 5:00 /km");
  expect(amountText("days", 4)).toBe("4");
  expect([0, 1, 2, 3].map(medalName)).toEqual(["", "Bronze", "Silver", "Gold"]);
});

test("where the account is, against the next step", () => {
  expect(standingText(WEEK_KM, "km")).toBe("14.5 / 20 km");
  expect(standingText(LONG_RUN, "km")).toBe("9 / 12 km");
  expect(standingText(LONG_OUTINGS, "km")).toBe("2 / 3");
  expect(standingText(PACE_5K, "km")).toBe("Best 6:20 /km · target 6:00 /km");
  expect(standingText({ ...PACE_5K, value: null, tier: 0 }, "km")).toBe(
    "No run of 5 km yet",
  );
  // Gold: against gold itself.
  expect(standingText({ ...WEEK_KM, value: 41_000, tier: 3 }, "km")).toBe("41 / 40 km");
});

test("the bar: the steps reached full, the next by the way to it", () => {
  expect(stepShares(WEEK_KM)).toEqual([1, 0.45, 0]);
  expect(stepShares({ ...WEEK_KM, value: 5_000, tier: 0 })).toEqual([0.5, 0, 0]);
  expect(stepShares({ ...WEEK_KM, value: 41_000, tier: 3 })).toEqual([1, 1, 1]);
  // A pace is beaten or not.
  expect(stepShares(PACE_5K)).toEqual([1, 0, 0]);
  expect(stepShares({ ...PACE_5K, value: null, tier: 0 })).toEqual([0, 0, 0]);
});

test("what a week or a month has left, on the phone's calendar", () => {
  // The week of the 19th ends with the 25th: the 26th is the day after.
  expect(periodLeftText("2026-10-26", noon(2026, 10, 23))).toBe("3 days left");
  expect(periodLeftText("2026-10-26", noon(2026, 10, 24))).toBe("2 days left");
  expect(periodLeftText("2026-10-26", noon(2026, 10, 25))).toBe("Ends today");
  expect(periodLeftText("not a day", noon(2026, 10, 25))).toBe("");
});

test("when a medal was won, and the streak, in words", () => {
  expect(periodText("week", "2026-10-12")).toBe("Week of Mon 12 Oct 2026");
  expect(periodText("month", "2026-10-01")).toBe("Month of Thu 1 Oct 2026");
  const [one, two] = PERSONAL.streaks;
  expect(streakRuleText(one)).toBe("1 outing a week");
  expect(streakRuleText(two)).toBe("2 outings a week");
  expect(streakText(one)).toBe("3 weeks · best 5");
  expect(streakText({ runs: 2, current: 1, best: 2 })).toBe("1 week · best 2");
});

test("in Italian", () => {
  saveLanguageChoice("it");
  expect(challengeName("month_early")).toBe("Mattiniero");
  expect(challengeWhat("week_long_outings", "km")).toBe("Uscite di almeno 3 km");
  expect(standingText(WEEK_KM, "km")).toBe("14,5 / 20 km");
  expect(medalName(2)).toBe("Argento");
  expect(streakText({ runs: 1, current: 14, best: 20 })).toBe(
    "14 settimane · record 20",
  );
});
