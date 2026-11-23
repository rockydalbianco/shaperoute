import { type BodyProfile, NO_BODY } from "../body/bodyProfile";
import {
  activityKcalOf,
  energyEditsFrom,
  NO_EDITS,
  restEstimatePerDay,
  restOf,
  withActivityKcal,
  withRest,
} from "./energyEdits";

const YEAR = 2026;
const BODY: BodyProfile = { sex: "male", weightKg: 70, heightCm: 175, birthYear: 1990 };

test("the estimate of a day at rest is Mifflin-St Jeor's", () => {
  // 10 × 70 + 6.25 × 175 − 5 × 36 + 5 = 1618.75
  expect(restEstimatePerDay(BODY, YEAR)).toBe(1619);
});

test("with no body, the estimate is one standard MET for 70 kg", () => {
  // 3.5 ml × 70 kg × 5 kcal/l × 1440 min = 1764
  expect(restEstimatePerDay(NO_BODY, YEAR)).toBe(1764);
});

test("the rest the user wrote takes the place of the estimate", () => {
  expect(restOf(NO_EDITS, BODY, YEAR)).toEqual({ kcal: 1619, edited: false });
  const edits = withRest(NO_EDITS, 1540);
  expect(restOf(edits, BODY, YEAR)).toEqual({ kcal: 1540, edited: true });
});

test("taking the user's rest away brings the estimate back", () => {
  const edits = withRest(withRest(NO_EDITS, 1540), null);
  expect(restOf(edits, BODY, YEAR)).toEqual({ kcal: 1619, edited: false });
});

test("a rest that makes no sense is not kept", () => {
  expect(withRest(NO_EDITS, 0).restKcalPerDay).toBeNull();
  expect(withRest(NO_EDITS, -10).restKcalPerDay).toBeNull();
  expect(withRest(NO_EDITS, 20001).restKcalPerDay).toBeNull();
  expect(withRest(NO_EDITS, Number.NaN).restKcalPerDay).toBeNull();
  expect(withRest(NO_EDITS, 1540.4).restKcalPerDay).toBe(1540);
});

test("the calories of one activity are corrected by hand, the others stay", () => {
  const edits = withActivityKcal(NO_EDITS, "run-1", 520);
  expect(activityKcalOf(edits, "run-1", 431.6)).toEqual({ kcal: 520, edited: true });
  expect(activityKcalOf(edits, "run-2", 431.6)).toEqual({ kcal: 432, edited: false });
  expect(NO_EDITS.activities).toEqual({});
});

test("an activity can be corrected to zero", () => {
  const edits = withActivityKcal(NO_EDITS, "walk-1", 0);
  expect(activityKcalOf(edits, "walk-1", 90)).toEqual({ kcal: 0, edited: true });
});

test("taking a correction away brings the activity's estimate back", () => {
  const edits = withActivityKcal(
    withActivityKcal(NO_EDITS, "run-1", 520),
    "run-1",
    null,
  );
  expect(edits.activities).toEqual({});
  expect(activityKcalOf(edits, "run-1", 431.6)).toEqual({ kcal: 432, edited: false });
  expect(withActivityKcal(NO_EDITS, "run-1", -5).activities).toEqual({});
});

test("a key that is a word of the language is still only a key", () => {
  expect(activityKcalOf(NO_EDITS, "constructor", 100)).toEqual({
    kcal: 100,
    edited: false,
  });
});

test("the corrections kept read back the same", () => {
  const edits = withActivityKcal(withRest(NO_EDITS, 1540), "run-1", 520);
  expect(energyEditsFrom(JSON.parse(JSON.stringify(edits)))).toEqual(edits);
});

test("what does not read is left to the estimate", () => {
  expect(energyEditsFrom(null)).toEqual(NO_EDITS);
  expect(
    energyEditsFrom({
      restKcalPerDay: "1540",
      activities: { "run-1": 520, "run-2": -1, "run-3": "many", "": 100 },
    }),
  ).toEqual({ restKcalPerDay: null, activities: { "run-1": 520 } });
});
