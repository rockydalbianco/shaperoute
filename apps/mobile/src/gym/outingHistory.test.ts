import type { AccountOutcome } from "../api/accounts";
import type { ActivitiesPage, Activity } from "../api/activities";
import {
  type SavedOuting,
  MAX_PAGES,
  lastMonthOutings,
  longestOf,
  mostClimbOf,
} from "./outingHistory";

// TASK-461 B and C (ADR-0371): «Già scritto dalle tue corse: 6,2 km il 3
// novembre», «Già scritto dai tuoi hike: 452 m il 26 ottobre».

const NOW = new Date("2026-11-12T10:00:00Z");

const SAVED: SavedOuting[] = [
  { started_at: "2026-11-10T07:00:00Z", distance_m: 5000, activity: "running" },
  { started_at: "2026-11-03T07:00:00Z", distance_m: 6200, activity: "running" },
  { started_at: "2026-11-01T07:00:00Z", distance_m: 41_000, activity: "cycling" },
  { started_at: "2026-10-30T07:00:00Z", distance_m: 45_500, activity: "gravel_biking" },
  {
    started_at: "2026-10-26T07:00:00Z",
    distance_m: 9100,
    activity: "hiking",
    climb_m: 452,
  },
  {
    started_at: "2026-10-20T07:00:00Z",
    distance_m: 7000,
    activity: "walking",
    climb_m: 600,
  },
  // More than a month ago.
  { started_at: "2026-10-01T07:00:00Z", distance_m: 12_000, activity: "running" },
  {
    started_at: "2026-10-02T07:00:00Z",
    distance_m: 14_000,
    activity: "hiking",
    climb_m: 900,
  },
];

test("the longest run of the last month", () => {
  expect(longestOf(SAVED, "run", NOW)).toEqual({
    metres: 6200,
    started_at: "2026-11-03T07:00:00Z",
  });
});

test("a ride of any bike counts for a bike, a walk and a hike for each other", () => {
  expect(longestOf(SAVED, "bike", NOW)?.metres).toBe(45_500);
  expect(longestOf(SAVED, "mtb", NOW)?.metres).toBe(45_500);
  expect(longestOf(SAVED, "walk", NOW)?.metres).toBe(9100);
  expect(longestOf(SAVED, "hike", NOW)?.metres).toBe(9100);
  expect(longestOf(SAVED, "swim", NOW)).toBeNull();
});

test("an activity of an API older than TASK-251 is a run", () => {
  expect(
    longestOf([{ started_at: "2026-11-05T07:00:00Z", distance_m: 8000 }], "run", NOW),
  ).toEqual({ metres: 8000, started_at: "2026-11-05T07:00:00Z" });
});

test("the most climb of the last month in one hike; none when the list says none", () => {
  expect(mostClimbOf(SAVED, NOW)).toEqual({
    metres: 452,
    started_at: "2026-10-26T07:00:00Z",
  });
  // Today's API says no climb in the list: the climb is asked.
  expect(
    mostClimbOf(
      SAVED.map(({ climb_m: _climb, ...rest }) => rest),
      NOW,
    ),
  ).toBeNull();
});

function activity(started_at: string): Activity {
  return {
    id: started_at,
    started_at,
    place: null,
    shape: null,
    word: null,
    style: null,
    title: null,
    distance_m: 5000,
    duration_s: 1800,
    score: null,
    fidelity: null,
    route_preview: null,
    track_preview: [],
  };
}

function page(dates: string[], next: string | null): AccountOutcome<ActivitiesPage> {
  return {
    kind: "ok",
    value: { activities: dates.map(activity), next, total: 99 },
  };
}

test("the pages are read from the newest until one is older than a month", async () => {
  const asked: (string | null)[] = [];
  const pages: Record<string, AccountOutcome<ActivitiesPage>> = {
    first: page(["2026-11-11T07:00:00Z", "2026-11-01T07:00:00Z"], "two"),
    two: page(["2026-10-20T07:00:00Z", "2026-10-05T07:00:00Z"], "three"),
    three: page(["2026-09-01T07:00:00Z"], null),
  };
  const read = await lastMonthOutings(async (cursor) => {
    asked.push(cursor);
    return pages[cursor ?? "first"];
  }, NOW);
  expect(asked).toEqual([null, "two"]);
  expect(read.map((one) => one.started_at)).toEqual([
    "2026-11-11T07:00:00Z",
    "2026-11-01T07:00:00Z",
    "2026-10-20T07:00:00Z",
  ]);
});

test("a page that fails ends the reading with what was read", async () => {
  const read = await lastMonthOutings(
    async (cursor) =>
      cursor === null
        ? page(["2026-11-11T07:00:00Z"], "two")
        : { kind: "unreachable", url: "http://api" },
    NOW,
  );
  expect(read).toHaveLength(1);
});

test("at most a few pages are read", async () => {
  let count = 0;
  await lastMonthOutings(async () => {
    count += 1;
    return page(["2026-11-11T07:00:00Z"], "more");
  }, NOW);
  expect(count).toBe(MAX_PAGES);
});
