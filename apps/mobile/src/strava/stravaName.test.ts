import { automaticName } from "./stravaName";

const run = (fields: Partial<Parameters<typeof automaticName>[0]>) => ({
  shape: null,
  word: null,
  title: null,
  place: null,
  ...fields,
});

test("the name says what was drawn and where, as the API's", () => {
  expect(automaticName(run({ shape: "heart", place: "Trento" }))).toBe(
    "Heart in Trento",
  );
  expect(automaticName(run({ shape: "christmas_tree" }))).toBe("Christmas tree");
  expect(automaticName(run({ word: "CIAO", place: "Levico Terme" }))).toBe(
    "CIAO in Levico Terme",
  );
  expect(automaticName(run({ title: "Castles", place: "Trento" }))).toBe(
    "Castles in Trento",
  );
});

test("a run that drew nothing has Strava's own name", () => {
  expect(automaticName(run({ place: "Trento" }))).toBeNull();
});
