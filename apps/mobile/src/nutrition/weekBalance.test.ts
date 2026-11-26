import { NO_BODY } from "../body/bodyProfile";
import { dayEnergy } from "./activityEnergy";
import { NO_EDITS } from "./energyEdits";
import { weekOf } from "./localDay";
import { todayLeftOut, weekRows, weekTotal } from "./weekBalance";

// A week of the day's balance (TASK-489 part D).

/** Monday 23 to Sunday 29 November 2026. */
const WEEK = weekOf("2026-11-26");
/** Thursday the 26th, 18:00 on the phone: three quarters of the day gone. */
const THURSDAY_EVENING = new Date(2026, 10, 26, 18, 0);
/** A day at rest with no body data: one MET for 70 kg. */
const REST = 1764;

function energies(now: Date, hub: "ready" | "loading" = "ready") {
  return WEEK.map((day) =>
    dayEnergy({ day, now, hub, list: [], body: NO_BODY, edits: NO_EDITS }),
  );
}

function eaten(written: { [day: string]: number }) {
  return (day: string) => written[day] ?? null;
}

test("the week is Monday to Sunday", () => {
  expect(WEEK[0]).toBe("2026-11-23");
  expect(WEEK[6]).toBe("2026-11-29");
});

test("a day written has what was eaten, what was used and their balance", () => {
  const rows = weekRows(
    energies(THURSDAY_EVENING),
    eaten({ "2026-11-23": 1500, "2026-11-24": 2500 }),
  );
  expect(rows[0]).toEqual({
    day: "2026-11-23",
    eaten: 1500,
    used: REST,
    balance: 1500 - REST,
    kind: "deficit",
    soFar: false,
  });
  expect(rows[1]).toMatchObject({ balance: 2500 - REST, kind: "surplus" });
});

test("a day with nothing written is empty, all of it, and so is a day to come", () => {
  const rows = weekRows(energies(THURSDAY_EVENING), eaten({ "2026-11-23": 1500 }));
  const empty = { eaten: null, used: null, balance: null, kind: null };
  expect(rows[2]).toEqual({ day: "2026-11-25", ...empty, soFar: false });
  expect(rows[4]).toEqual({ day: "2026-11-27", ...empty, soFar: false });
});

test("today shows what it has so far", () => {
  const rows = weekRows(energies(THURSDAY_EVENING), eaten({ "2026-11-26": 1240 }));
  expect(rows[3]).toEqual({
    day: "2026-11-26",
    eaten: 1240,
    used: 1323,
    balance: 1240 - 1323,
    kind: "deficit",
    soFar: true,
  });
  expect(todayLeftOut(rows)).toBe(true);
});

test("the total adds up the days that are over and written, not today", () => {
  const rows = weekRows(
    energies(THURSDAY_EVENING),
    eaten({ "2026-11-23": 1500, "2026-11-24": 2500, "2026-11-26": 1240 }),
  );
  expect(weekTotal(rows)).toEqual({
    eaten: 4000,
    used: 2 * REST,
    balance: 4000 - 2 * REST,
    kind: "surplus",
    days: 2,
  });
});

test("once the week is over every written day counts", () => {
  const after = new Date(2026, 10, 30, 9, 0);
  const rows = weekRows(
    energies(after),
    eaten({ "2026-11-23": 1500, "2026-11-26": 1240 }),
  );
  expect(todayLeftOut(rows)).toBe(false);
  expect(weekTotal(rows)).toMatchObject({
    eaten: 2740,
    used: 2 * REST,
    kind: "deficit",
    days: 2,
  });
});

test("a week with no day to count has no total", () => {
  expect(weekTotal(weekRows(energies(THURSDAY_EVENING), eaten({})))).toBeNull();
  // Only today written: nothing is over yet.
  const rows = weekRows(energies(THURSDAY_EVENING), eaten({ "2026-11-26": 1240 }));
  expect(weekTotal(rows)).toBeNull();
  // Today without a diary leaves nothing out.
  expect(todayLeftOut(weekRows(energies(THURSDAY_EVENING), eaten({})))).toBe(false);
});

test("eaten exactly what was used is neither a surplus nor a deficit", () => {
  const rows = weekRows(energies(THURSDAY_EVENING), eaten({ "2026-11-23": REST }));
  expect(rows[0]).toMatchObject({ balance: 0, kind: "even" });
  expect(weekTotal(rows)).toMatchObject({ balance: 0, kind: "even" });
});

test("while the activities are on their way no day has a balance", () => {
  const rows = weekRows(
    energies(THURSDAY_EVENING, "loading"),
    eaten({ "2026-11-23": 1500 }),
  );
  expect(rows[0]).toMatchObject({ eaten: null, used: null, balance: null });
});
