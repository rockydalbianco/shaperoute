import { fireEvent, render, screen } from "@testing-library/react-native";

import { ALL_SPORTS, isStoreBuild, loadSport, shownSports, SPORTS } from "./sport";
import { SportButton } from "./SportButton";
import { SportSetting } from "./SportSetting";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-file-system");
jest.mock("./sport", () => ({
  ...jest.requireActual<typeof import("./sport")>("./sport"),
  loadSport: jest.fn(),
  saveSport: jest.fn(),
}));

/** What a store build shows (TASK-318, ADR-0278). */
const STORE = shownSports(ALL_SPORTS, true);

beforeEach(() => {
  jest.mocked(loadSport).mockReturnValue("run");
});

test("a store build is told by its runtime version, Expo Go and preview by «exposdk:»", () => {
  expect(isStoreBuild({ runtimeVersion: { policy: "fingerprint" } })).toBe(true);
  expect(
    isStoreBuild({ runtimeVersion: "83793e26fc0da7cdc7d8c7f7b1b7ad09e6f823b3" }),
  ).toBe(true);
  expect(isStoreBuild({ runtimeVersion: "exposdk:57.0.0" })).toBe(false);
  expect(isStoreBuild({})).toBe(false);
  expect(isStoreBuild(null)).toBe(false);
  expect(isStoreBuild(undefined)).toBe(false);
});

test("the tests run as Expo Go: every sport, «Paragliding» included", () => {
  expect(isStoreBuild()).toBe(false);
  expect(SPORTS.map((option) => option.id)).toEqual(
    ALL_SPORTS.map((option) => option.id),
  );
  expect(SPORTS.map((option) => option.id)).toContain("paragliding");
});

test("Expo Go and preview turn on the sports tried there first (`preview`, TASK-323)", () => {
  // The swim went this way before the store builds had it; none does now.
  expect(ALL_SPORTS.some((option) => option.preview === true)).toBe(false);
  const tried = {
    id: "walk",
    emoji: "🚶",
    name: "Walk",
    ready: false,
    preview: true,
  } as const;
  expect(shownSports([tried], false)).toEqual([{ ...tried, ready: true }]);
  // A store build still leaves it out, as any sport not ready.
  expect(shownSports([tried], true)).toEqual([]);
});

test("a store build leaves out the sports not ready, and keeps the order", () => {
  expect(STORE.map((option) => option.id)).toEqual([
    "walk",
    "run",
    "hike",
    "bike",
    "gravel",
    "mtb",
    "roller",
    "paddle",
    "swim",
    "ski",
    "xc_ski",
    "skimo",
    "gym",
    "paragliding",
  ]);
  expect(STORE.every((option) => option.ready)).toBe(true);
});

test("in a store build `SPORTS` has «Paragliding» since TASK-305 R2", () => {
  jest.isolateModules(() => {
    jest.doMock("expo-constants", () => ({
      __esModule: true,
      default: { expoConfig: { runtimeVersion: { policy: "fingerprint" } } },
    }));
    const store = jest.requireActual<typeof import("./sport")>("./sport");
    expect(store.isStoreBuild()).toBe(true);
    expect(store.SPORTS.map((option) => option.id)).toEqual([
      "walk",
      "run",
      "hike",
      "bike",
      "gravel",
      "mtb",
      "roller",
      "paddle",
      "swim",
      "ski",
      "xc_ski",
      "skimo",
      "gym",
      "paragliding",
    ]);
  });
});

test("«Settings» of a store build has no «Soon» row", async () => {
  await render(<SportSetting sports={STORE} />);
  // Walk (TASK-371), run, the hike (TASK-377), bike, gravel and MTB
  // (TASK-378), the skate (TASK-380), paddle, the swim (TASK-323), the
  // alpine and the cross-country ski (TASK-375), ski touring (TASK-415 B),
  // the gym (TASK-385 B) and the flight (TASK-305 R2).
  expect(screen.getAllByRole("radio")).toHaveLength(14);
  expect(screen.getByRole("radio", { name: "Cross-country ski" })).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: "Roller" })).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: "Walk" })).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: "Hike" })).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: "Gravel" })).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: "MTB" })).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: "Ski" })).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: "Ski touring" })).toBeOnTheScreen();
  expect(screen.queryByText("Soon")).toBeNull();
  expect(screen.queryByLabelText("Paragliding, coming soon")).toBeNull();
  expect(screen.getByRole("radio", { name: "Paragliding" })).toBeOnTheScreen();
  // Swimming is a sport of the store builds since the server swims
  // (TASK-323), a row like the others.
  expect(screen.getByRole("radio", { name: "Swim" })).toBeOnTheScreen();
  expect(screen.getByText("🏊")).toBeOnTheScreen();
});

test("the sport menu of «Draw» in a store build has no «Soon» row", async () => {
  await render(<SportButton sports={STORE} />);
  await fireEvent.press(screen.getByRole("button", { name: "Sport, Run" }));
  // The fourteen of «Settings».
  expect(screen.getAllByRole("radio")).toHaveLength(14);
  expect(screen.queryByText("Soon")).toBeNull();
  expect(screen.queryByLabelText("Paragliding, coming soon")).toBeNull();
});
