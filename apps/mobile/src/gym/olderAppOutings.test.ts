import plans from "@shaperoute/shared-types/fixtures/gym-plans.json";
import type { GymPlan } from "@shaperoute/shared-types";

import { answers } from "../account/testing";
import { isGymPlans, saveGymPlan } from "../api/gymPlans";
import { forgetPlans, keepPlan, todayPlan } from "./plans";
import { sessionsOfWeek } from "./program";
import { withDays } from "./proposal";

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
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});

// TASK-461 B and C (ADR-0371): an app older than the days out reads a plan
// with them (a ride, a pool swim, a brisk walk, a climb) without showing
// anything false. Its «Today» skips a day out, which has no run and no
// exercises, so a ride is never called a run; the plan's list shows the
// day's name, which says the sport and the amount; and its edits keep the
// `outing` and the program's `target`, so a plan saved again from an older
// phone loses neither.

const all = plans.plans as GymPlan[];
const bike = all.find((plan) => plan.key === "pl00000000000005") as GymPlan;
const mountain = all.find((plan) => plan.key === "pl00000000000006") as GymPlan;
const naming = { t: (text: string) => text, language: "en" as const };

test("the days out of the example say their sport and amount in their name", () => {
  const names = [bike, mountain].flatMap((plan) =>
    (plan.program?.sessions ?? []).filter((one) => one.outing !== undefined),
  );
  expect(names.map((one) => one.name)).toEqual([
    "Bike intervals · 5 × 3:00",
    "Pool · 8 × 100 m",
    "Long ride · 30 km",
    "Brisk walk uphill · 45 min",
    "Hike · 450 m climb",
  ]);
});

test("an older «Today» shows the gym day and no day out", () => {
  // The bike plan from Monday 2 November 2026: Monday the gym, Wednesday
  // the bike intervals, Friday the pool, Sunday the long ride.
  const monday = todayPlan([bike], new Date(2026, 10, 2, 9));
  expect(monday?.name).toBe("Full body A");
  expect(monday?.run).toBeUndefined();
  for (const day of [4, 6, 8]) {
    expect(todayPlan([bike], new Date(2026, 10, day, 9))).toBeNull();
  }
  // The mountain plan: Saturday's climb is no «Today» either.
  expect(todayPlan([mountain], new Date(2026, 10, 7, 9))).toBeNull();
});

test("an older app keeps the days out and the target when it works out or edits a plan", () => {
  const program = bike.program;
  if (program == null) {
    throw new Error("the bike plan has its weeks");
  }
  const week = sessionsOfWeek(program, 3);
  expect(
    week.filter((one) => one.outing !== undefined).map((one) => one.outing),
  ).toEqual(
    program.sessions.flatMap((one) => (one.outing === undefined ? [] : [one.outing])),
  );
  const edited = withDays(program, bike.days, naming);
  expect(edited.target).toEqual(program.target);
  expect(edited.sessions).toEqual(program.sessions);
});

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");

test("an older app reads such a plan and saves it again with its days out and target", async () => {
  files.clear();
  forgetPlans();
  // The answer of GET /me/gym-plans is a list it takes.
  expect(isGymPlans({ plans: [bike, mountain] })).toBe(true);
  // Renamed on an older phone: kept on the phone, then sent whole.
  const { key, position: _position, updated_at: _at, ...rest } = mountain;
  const kept = keepPlan(7, key, { ...rest, name: "Rifugio" });
  expect(kept.program?.target).toEqual(mountain.program?.target);
  expect(kept.program?.sessions).toEqual(mountain.program?.sessions);
  const saving: jest.Mock = jest.fn(
    answers({ status: 200, body: { ...mountain, name: "Rifugio" } }),
  );
  const { owner: _owner, state: _state, key: _key, ...request } = kept;
  await saveGymPlan("http://api", "token", key, request, {
    fetchFn: saving,
    key: null,
  });
  const sent = JSON.parse(String(saving.mock.calls[0][1]?.body));
  expect(sent.program.target).toEqual({ sport: "hike", climb_m: 1000 });
  expect(sent.program.sessions.map((one: { outing?: unknown }) => one.outing)).toEqual(
    mountain.program?.sessions.map((one) => one.outing),
  );
});
