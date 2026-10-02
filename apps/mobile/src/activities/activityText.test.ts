import activities from "@shaperoute/shared-types/fixtures/activities.json";

import { runFacts, startedLabel, whereAndWhat } from "./activityText";

const [STAR, FREE] = activities.activities;

test("a run began on a day and at a time of the phone's clock", () => {
  // Built on the clock of whoever runs the test, as the phone reads it.
  expect(startedLabel(new Date(2026, 9, 2, 8, 12).toISOString())).toBe(
    "Fri 2 Oct 2026 · 08:12",
  );
  expect(startedLabel(new Date(2026, 0, 11, 17, 5, 59).toISOString())).toBe(
    "Sun 11 Jan 2026 · 17:05",
  );
  expect(startedLabel(new Date(2025, 11, 31, 0, 0).toISOString())).toBe(
    "Wed 31 Dec 2025 · 00:00",
  );
});

test("a moment that is not one says nothing", () => {
  expect(startedLabel("yesterday")).toBe("");
  expect(startedLabel("")).toBe("");
});

test("where a run began comes before what it drew", () => {
  expect(whereAndWhat(STAR, true)).toBe("Trento · Star");
  expect(whereAndWhat({ ...STAR, place: null }, true)).toBe("Star");
  expect(whereAndWhat({ ...STAR, shape: null, word: "CIAO" }, true)).toBe(
    "Trento · CIAO",
  );
  expect(whereAndWhat({ ...STAR, shape: null, title: "Fountains" }, true)).toBe(
    "Trento · Fountains",
  );
  expect(whereAndWhat({ ...STAR, shape: "christmas_tree" }, true)).toBe(
    "Trento · Christmas tree",
  );
});

test("a run without a route drew nothing", () => {
  expect(whereAndWhat({ ...FREE, place: "Milan" }, false)).toBe("Milan");
  // Whatever the fields say: there was no route.
  expect(whereAndWhat({ ...STAR, place: "Trento" }, false)).toBe("Trento");
  expect(whereAndWhat(FREE, false)).toBe("Run");
});

test("how far, how long and how fast", () => {
  expect(runFacts(STAR)).toBe("4.01 km · 19:00 · 4:45 /km");
  expect(runFacts({ distance_m: 21_097, duration_s: 6_300 })).toBe(
    "21.10 km · 1:45:00 · 4:59 /km",
  );
  // Too short for a pace: the first strides say nothing.
  expect(runFacts({ distance_m: 77, duration_s: 30 })).toBe("0.08 km · 0:30");
});
