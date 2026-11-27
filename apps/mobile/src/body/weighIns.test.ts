import { setCurrentOwner } from "../account/currentOwner";
import { appBody, saveBody } from "./bodyProfile";
import { removeWeighIn, weighInNotNow, writeWeighIn } from "./useWeighIns";
import {
  appWeighIns,
  daysBetween,
  DEFAULT_EVERY,
  forgetWeighIns,
  latestOf,
  loadWeighIns,
  NO_WEIGH_INS,
  rangeStart,
  saveWeighIns,
  valueIn,
  WEIGH_INS_FILE,
  weighInDue,
  weighInsFrom,
  weightStats,
  weeksIn,
  withoutWeighIn,
  withWeighIn,
} from "./weighIns";

// The phone's documents folder, in memory, as in bodyProfile.test.ts.

jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  const state = { failing: false };
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      if (state.failing) {
        throw new Error("No space left on device");
      }
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
  return { File, Paths: { document: { uri: "file:///documents/" } }, files, state };
});

const disk = jest.requireMock<{
  files: Map<string, string>;
  state: { failing: boolean };
}>("expo-file-system");

afterEach(() => {
  disk.files.clear();
  disk.state.failing = false;
  setCurrentOwner(null);
  forgetWeighIns();
});

function weighIns(...entries: [string, number][]) {
  return {
    ...NO_WEIGH_INS,
    entries: entries.map(([day, kg]) => ({ day, kg })),
  };
}

test("a file that does not read is no weigh-ins, and each bad field is left out", () => {
  expect(weighInsFrom(null)).toEqual(NO_WEIGH_INS);
  expect(weighInsFrom("x")).toEqual(NO_WEIGH_INS);
  const read = weighInsFrom({
    entries: [
      { day: "2026-11-02", kg: 80 },
      { day: "2026-10-01", kg: 82 },
      { day: "not a day", kg: 70 },
      { day: "2026-10-15", kg: 900 },
      { day: "2026-11-02", kg: 79.5 },
    ],
    every: 3,
    notNow: "yesterday",
    goal: { kg: 76, fromKg: "80" },
    milestones: [78, 78, 10, "x"],
    celebrated: ["weighIns:5", 7, "weighIns:5"],
  });
  expect(read).toEqual({
    entries: [
      { day: "2026-10-01", kg: 82 },
      { day: "2026-11-02", kg: 79.5 },
    ],
    every: DEFAULT_EVERY,
    notNow: null,
    goal: null,
    milestones: [78],
    celebrated: ["weighIns:5"],
  });
});

test("a second weigh-in on a day replaces the first, and the entries stay in order", () => {
  let kept = withWeighIn(NO_WEIGH_INS, "2026-11-10", 80);
  kept = withWeighIn(kept, "2026-10-10", 82);
  kept = withWeighIn(kept, "2026-11-10", 79.6);
  expect(kept.entries).toEqual([
    { day: "2026-10-10", kg: 82 },
    { day: "2026-11-10", kg: 79.6 },
  ]);
  expect(latestOf(kept)).toEqual({ day: "2026-11-10", kg: 79.6 });
  // A weight the body does not take changes nothing.
  expect(withWeighIn(kept, "2026-11-11", 12)).toBe(kept);
  expect(withoutWeighIn(kept, "2026-10-10").entries).toEqual([
    { day: "2026-11-10", kg: 79.6 },
  ]);
});

test("the card shows before the first weigh-in, then after the weeks chosen", () => {
  expect(weighInDue(NO_WEIGH_INS, "2026-11-27")).toBe(true);
  const two = weighIns(["2026-11-13", 80]);
  expect(weighInDue(two, "2026-11-26")).toBe(false);
  expect(weighInDue(two, "2026-11-27")).toBe(true);
  expect(weighInDue({ ...two, every: 1 }, "2026-11-20")).toBe(true);
  expect(weighInDue({ ...two, every: 4 }, "2026-12-10")).toBe(false);
  expect(weighInDue({ ...two, every: 4 }, "2026-12-11")).toBe(true);
  expect(weighInDue({ ...two, every: 0 }, "2027-06-01")).toBe(false);
});

test("«Not now» keeps the card away for a week; a weigh-in clears it", () => {
  const due = { ...weighIns(["2026-11-01", 80]), notNow: "2026-11-20" };
  expect(weighInDue(due, "2026-11-26")).toBe(false);
  expect(weighInDue(due, "2026-11-27")).toBe(true);
  expect(withWeighIn(due, "2026-11-21", 79).notNow).toBeNull();
});

test("the chart reads kilograms, the change, or the percent of the starting weight", () => {
  expect(valueIn("kg", 79.6, 82.4)).toBe(79.6);
  expect(valueIn("change", 79.6, 82.4)).toBeCloseTo(-2.8);
  expect(valueIn("percent", 79.6, 82.4)).toBeCloseTo(-3.398, 2);
  expect(rangeStart("weeks", "2026-11-27")).toBe("2026-09-04");
  expect(rangeStart("months", "2026-11-27")).toBe("2025-11-27");
  expect(rangeStart("all", "2026-11-27")).toBeNull();
});

test("the statistics: start, today, highest, lowest, a week on average", () => {
  const kept = weighIns(
    ["2026-09-04", 82.4],
    ["2026-09-18", 81.9],
    ["2026-10-02", 82.6],
    ["2026-11-27", 79.6],
  );
  const stats = weightStats(kept);
  expect(stats).not.toBeNull();
  expect(stats?.start).toEqual({ day: "2026-09-04", kg: 82.4 });
  expect(stats?.latest).toEqual({ day: "2026-11-27", kg: 79.6 });
  expect(stats?.highestKg).toBe(82.6);
  expect(stats?.lowestKg).toBe(79.6);
  expect(stats?.changeKg).toBeCloseTo(-2.8);
  expect(stats?.days).toBe(84);
  expect(stats?.perWeekKg).toBeCloseTo(-2.8 / 12);
  expect(stats?.count).toBe(4);
  expect(weeksIn(84)).toBe(12);
  expect(weightStats(NO_WEIGH_INS)).toBeNull();
  // Under a week there is no average.
  expect(
    weightStats(weighIns(["2026-11-25", 80], ["2026-11-27", 79]))?.perWeekKg,
  ).toBeNull();
});

test("days between two days count whole days across a change of clock", () => {
  expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2);
  expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
});

test("the weigh-ins are kept for the account signed in, and another account does not see them", () => {
  setCurrentOwner(12);
  saveWeighIns(weighIns(["2026-11-27", 80]));
  expect(disk.files.has("file:///documents/weigh-ins.12.json")).toBe(true);
  forgetWeighIns();
  expect(appWeighIns().entries).toHaveLength(1);
  setCurrentOwner(13);
  expect(appWeighIns()).toEqual(NO_WEIGH_INS);
  expect(loadWeighIns()).toEqual(NO_WEIGH_INS);
});

test("a phone that refuses still holds the weigh-ins while the app is open", () => {
  disk.state.failing = true;
  expect(saveWeighIns(weighIns(["2026-11-27", 80]))).toBe(false);
  expect(appWeighIns().entries).toHaveLength(1);
  expect(disk.files.has(`file:///documents/${WEIGH_INS_FILE}`)).toBe(false);
});

test("the latest weigh-in becomes the body's weight; one taken away does not change it", () => {
  saveBody({ sex: "male", weightKg: 82, heightCm: 178, birthYear: 1990 });
  writeWeighIn("2026-11-27", 79.6);
  expect(appBody().weightKg).toBe(79.6);
  // An older weigh-in written later is not the latest: the body stays.
  writeWeighIn("2026-11-01", 81);
  expect(appBody().weightKg).toBe(79.6);
  removeWeighIn("2026-11-27");
  expect(appBody().weightKg).toBe(79.6);
  expect(latestOf(appWeighIns())).toEqual({ day: "2026-11-01", kg: 81 });
});

test("«Not now» is kept with the day", () => {
  weighInNotNow("2026-11-27");
  expect(appWeighIns().notNow).toBe("2026-11-27");
  expect(loadWeighIns().notNow).toBe("2026-11-27");
});
