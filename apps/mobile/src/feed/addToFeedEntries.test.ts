import { ADD_TO_FEED_ICONS, addToFeedEntries } from "./addToFeedEntries";

// The entries of the Feed's «+» (TASK-481, ADR-0390): the ready ones, in
// the user's order, without «Soon».

test("all ready: «Record now», «Already recorded», «Photos only», «From a file», «Gym workout», «Workout plan», in this order", () => {
  const entries = addToFeedEntries({ record: true, filePicker: true });
  expect(entries.map((entry) => entry.id)).toEqual([
    "record",
    "done",
    "photos",
    "file",
    "gym",
    "plan",
  ]);
  expect(entries.map((entry) => entry.title)).toEqual([
    "Record now",
    "Already recorded",
    "Photos only",
    "From a file",
    "Gym workout",
    "Workout plan",
  ]);
  expect(entries[0].detail).toBe("Start an activity now");
  expect(entries[1].detail).toBe("Post an activity from My activities");
  expect(entries[2].detail).toBe("Up to 10 photos, also from Instagram");
  expect(entries[3].detail).toBe("GPX, TCX or FIT from Strava, Garmin, Komoot…");
  expect(entries[4].detail).toBe("A workout you already did, written by hand");
  expect(entries[5].detail).toBe("Share one of your gym plans");
});

test("without the file picker in the app there is no «From a file»", () => {
  const entries = addToFeedEntries({ record: true, filePicker: false });
  expect(entries.map((entry) => entry.id)).toEqual([
    "record",
    "done",
    "photos",
    "gym",
    "plan",
  ]);
});

test("without a way to record there is no «Record now»", () => {
  const entries = addToFeedEntries({ record: false, filePicker: true });
  expect(entries.map((entry) => entry.id)).toEqual([
    "done",
    "photos",
    "file",
    "gym",
    "plan",
  ]);
});

test("«Already recorded», «Photos only», «Gym workout» and «Workout plan» are always there", () => {
  const entries = addToFeedEntries({ record: false, filePicker: false });
  expect(entries.map((entry) => entry.id)).toEqual(["done", "photos", "gym", "plan"]);
});

test("«Sleep» comes after «From a file» when it is ready", () => {
  const entries = addToFeedEntries({ record: true, filePicker: true, sleep: true });
  expect(entries.map((entry) => entry.id)).toEqual([
    "record",
    "done",
    "photos",
    "file",
    "sleep",
    "gym",
    "plan",
  ]);
});

// TASK-509: no row of words alone. Every entry the sheet can list has its
// own sign: a new entry without one fails here (and does not compile).
test("every entry has its own icon, «Sleep» too", () => {
  const entries = addToFeedEntries({ record: true, filePicker: true, sleep: true });
  expect(entries.map((entry) => entry.id)).toEqual([
    "record",
    "done",
    "photos",
    "file",
    "sleep",
    "gym",
    "plan",
  ]);
  for (const entry of entries) {
    expect(ADD_TO_FEED_ICONS[entry.id]).toBeDefined();
  }
  const files = Object.values(ADD_TO_FEED_ICONS).map((icon) => JSON.stringify(icon));
  expect(new Set(files).size).toBe(entries.length);
  expect(Object.keys(ADD_TO_FEED_ICONS).sort()).toEqual(
    entries.map((entry) => entry.id).sort(),
  );
});
