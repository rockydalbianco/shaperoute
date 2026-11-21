import { render, screen } from "@testing-library/react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { activityOffered, ALL_SPORTS } from "../settings/sport";
import { FilterSheet } from "./FilterSheet";
import { NO_FILTERS, SEARCH_ACTIVITIES } from "./searchFilters";

// TASK-371: the search's filter offers a walk once «Walk» is ready, the
// server walking: a filter the app shows never gets a 422.

const INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

test("a walk is offered since «Walk» is ready, and not while it is «Soon»", () => {
  expect(ALL_SPORTS.find((sport) => sport.id === "walk")?.ready).toBe(true);
  expect(activityOffered("walking")).toBe(true);
  // And the hike since «Hike» is ready (TASK-377), gravel and MTB since
  // «Gravel» and «MTB» are (TASK-378), the skate since «Roller» is (TASK-380),
  // a wheelchair since «Wheelchair & stroller» is (TASK-414 B), snowshoes
  // since «Snowshoes» is (TASK-413).
  expect(SEARCH_ACTIVITIES).toEqual([
    "running",
    "cycling",
    "paddling",
    "swimming",
    "hiking",
    "mountain_biking",
    "inline_skating",
    "snowshoeing",
    "wheelchair",
    "walking",
    "gravel_biking",
  ]);
  const soon = ALL_SPORTS.map((sport) =>
    sport.id === "walk" ? { ...sport, ready: false } : sport,
  );
  expect(activityOffered("walking", soon)).toBe(false);
  expect(activityOffered("running", soon)).toBe(true);
});

test("the filters' sheet has «Walk»", async () => {
  await render(
    <SafeAreaInsetsContext.Provider value={INSETS}>
      <FilterSheet visible filters={NO_FILTERS} onApply={() => {}} onClose={() => {}} />
    </SafeAreaInsetsContext.Provider>,
  );
  expect(screen.getByTestId("filter-activity-running")).toBeOnTheScreen();
  expect(screen.getByTestId("filter-activity-walking")).toBeOnTheScreen();
});
