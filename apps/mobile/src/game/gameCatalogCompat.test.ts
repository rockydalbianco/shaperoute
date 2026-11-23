import catalog from "@shaperoute/shared-types/fixtures/game-catalog.json";
import me from "@shaperoute/shared-types/fixtures/game-me.json";
import run from "@shaperoute/shared-types/fixtures/game-run.json";
import profile from "@shaperoute/shared-types/fixtures/public-profile.json";

import { isPublicProfile } from "../api/profiles";
import { isGameCatalog, isGameMe, isRunGame } from "./gameApi";
import { goalText } from "./goalText";

// TASK-423 (ADR-0351): the catalog grows to 94 shapes in 10 collections,
// with milestones of one run. The app already installed checks the catalog
// with `isGameCatalog` and hides «Play» when it fails: these are its checks,
// on the answers of the new API.

/** The first 5K, as the API serves it: a pace goal at 20:00 a km. */
const milestone = {
  id: "balloon",
  names: { en: "Balloon", de: "Ballon", it: "Palloncino", es: "Globo", fr: "Ballon" },
  goal: {
    kind: "pace",
    total_m: null,
    distance_m: 5000,
    pace_s: 1200,
    single_run: true,
  },
  outline: [
    [0.5, 0.0],
    [1.0, 1.0],
    [0.0, 1.0],
    [0.5, 0.0],
  ],
  collection: "milestones",
};

test("the app of today reads the catalog with collections and milestones", () => {
  const grown = {
    ...catalog,
    shapes: [...catalog.shapes, milestone],
    collections: [
      ...catalog.collections,
      { id: "milestones", names: { ...milestone.names, en: "Milestones" } },
    ],
  };
  expect(isGameCatalog(grown)).toBe(true);
});

test("the app of today reads the game of the account with its collections", () => {
  expect(isGameMe(me)).toBe(true);
});

test("a catalog from before TASK-423 still reads", () => {
  const { collections: _collections, ...before } = catalog;
  const shapes = before.shapes.map(({ collection: _collection, ...shape }) => shape);
  expect(isGameCatalog({ ...before, shapes })).toBe(true);
});

test("a milestone reads «One run of 5 km»; an app before part D wrote the pace", () => {
  // The app before TASK-423 part D did not read `single_run`: its words, a
  // pace that any run meets, stayed true. From part D, the milestone's own.
  const goal = { kind: "pace", total_m: null, distance_m: 5000, pace_s: 1200 } as const;
  expect(goalText(goal, "km")).toBe("5 km under 20:00 /km");
  expect(goalText({ ...goal, single_run: true }, "km")).toBe("One run of 5 km");
});

// TASK-423 part E: the prizes add fields to three answers the app in
// production reads. Its checks let them through, as they are.
test("the app of today reads the game, a run and a profile with the prizes", () => {
  const silver = {
    ...me,
    shapes: me.shapes.map((shape) =>
      shape.id === "lightning"
        ? { ...shape, edition: "silver", edition_runs: 3 }
        : shape,
    ),
  };
  expect(isGameMe(silver)).toBe(true);
  // The run's example names an edition and a collection completed.
  expect(run.editions).toHaveLength(1);
  expect(isRunGame(run)).toBe(true);
  for (const game_prizes of [
    null,
    { frame: "geometry", title: "runner", badges: ["streak_4"] },
  ]) {
    expect(isPublicProfile({ ...profile, game_prizes })).toBe(true);
  }
});
