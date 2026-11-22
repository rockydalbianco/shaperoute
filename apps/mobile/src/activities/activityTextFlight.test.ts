import activities from "@shaperoute/shared-types/fixtures/activities.json";

import { runFacts, sportPaceLabel, whereAndWhat } from "./activityText";

// A flight in «My activities» (TASK-305): no run, so neither «Run» when
// nobody knows where it began, nor a pace per km.

const [STAR, FREE] = activities.activities;

test("a flight without a place nor a drawing is called by its sport, a run still «Run»", () => {
  expect(whereAndWhat({ ...FREE, activity: "paragliding" }, false)).toBe("Paragliding");
  expect(whereAndWhat({ ...FREE, activity: "running" }, false)).toBe("Run");
  expect(whereAndWhat(FREE, false)).toBe("Run");
  // Where it began, when known, comes first as for every sport.
  expect(whereAndWhat({ ...STAR, activity: "paragliding" }, false)).toBe("Trento");
});

test("a flight has its speed, not a pace per km", () => {
  expect(
    runFacts({ distance_m: 11_320, duration_s: 2700, activity: "paragliding" }),
  ).toBe("11.32 km · 45:00 · 15.1 km/h");
  expect(runFacts({ distance_m: 11_320, duration_s: 2700, activity: "running" })).toBe(
    "11.32 km · 45:00 · 3:59 /km",
  );
  // Too short a way, or no time: no speed, as no pace.
  expect(sportPaceLabel("paragliding", 50, 60_000)).toBeNull();
  expect(sportPaceLabel("paragliding", 5000, 0)).toBeNull();
});
