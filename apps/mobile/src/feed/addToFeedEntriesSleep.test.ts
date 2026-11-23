import { addToFeedEntries } from "./addToFeedEntries";

// «Sleep» among the entries of the Feed's «+» (TASK-467 part E, TASK-481):
// the fifth in the user's order (after «Already recorded», TASK-481 F), there only when the sleep is on and the
// phone can read it. Left out, as in every build until part C, the list is
// the one of before.

test("off, or left out: the list is the one of before", () => {
  // «Workout plan» (TASK-485) is always last.
  const before = ["record", "done", "photos", "file", "plan"];
  expect(
    addToFeedEntries({ record: true, filePicker: true }).map(({ id }) => id),
  ).toEqual(before);
  expect(
    addToFeedEntries({ record: true, filePicker: true, sleep: false }).map(
      ({ id }) => id,
    ),
  ).toEqual(before);
});

test("on: «Sleep» comes after «From a file», with what it publishes", () => {
  const entries = addToFeedEntries({ record: true, filePicker: true, sleep: true });
  expect(entries.map(({ id }) => id)).toEqual([
    "record",
    "done",
    "photos",
    "file",
    "sleep",
    "plan",
  ]);
  expect(entries[4]).toEqual({
    id: "sleep",
    title: "Sleep",
    detail: "Last night's sleep score, from Apple Health",
  });
});

test("on, with nothing else ready: after «Photos only»", () => {
  const entries = addToFeedEntries({ record: false, filePicker: false, sleep: true });
  expect(entries.map(({ id }) => id)).toEqual(["done", "photos", "sleep", "plan"]);
});
