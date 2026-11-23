import { addToFeedEntries } from "./addToFeedEntries";

// The entries of the Feed's «+» (TASK-481, ADR-0390): the ready ones, in
// the user's order, without «Soon».

test("all ready: «Record now», «Photos only», «From a file», «Gym workout», «Workout plan», in this order", () => {
  const entries = addToFeedEntries({ record: true, filePicker: true });
  expect(entries.map((entry) => entry.id)).toEqual([
    "record",
    "photos",
    "file",
    "gym",
    "plan",
  ]);
  expect(entries.map((entry) => entry.title)).toEqual([
    "Record now",
    "Photos only",
    "From a file",
    "Gym workout",
    "Workout plan",
  ]);
  expect(entries[0].detail).toBe("Start an activity now");
  expect(entries[1].detail).toBe("Up to 10 photos, also from Instagram");
  expect(entries[2].detail).toBe("GPX, TCX or FIT from Strava, Garmin, Komoot…");
  expect(entries[3].detail).toBe("A workout you already did, written by hand");
  expect(entries[4].detail).toBe("Share one of your gym plans");
});

test("without the file picker in the app there is no «From a file»", () => {
  const entries = addToFeedEntries({ record: true, filePicker: false });
  expect(entries.map((entry) => entry.id)).toEqual(["record", "photos", "gym", "plan"]);
});

test("without a way to record there is no «Record now»", () => {
  const entries = addToFeedEntries({ record: false, filePicker: true });
  expect(entries.map((entry) => entry.id)).toEqual(["photos", "file", "gym", "plan"]);
});

test("«Photos only», «Gym workout» and «Workout plan» are always there", () => {
  const entries = addToFeedEntries({ record: false, filePicker: false });
  expect(entries.map((entry) => entry.id)).toEqual(["photos", "gym", "plan"]);
});
