import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { ALL_SPORTS, loadSport, saveSport, SPORTS, type SportOption } from "./sport";
import {
  pairWidth,
  panelMaxHeight,
  SportButton,
  tileHeight,
  tileWidth,
} from "./SportButton";
import { FAMILY_OF, groupSports, SPORT_FAMILIES } from "./sportFamilies";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-file-system");
jest.mock("./sport", () => {
  const actual = jest.requireActual<typeof import("./sport")>("./sport");
  return { ...actual, loadSport: jest.fn(), saveSport: jest.fn(actual.saveSport) };
});

/** One sport of every family, one not ready. */
const MIXED: SportOption[] = [
  { id: "walk", emoji: "🚶", name: "Walk", ready: true },
  { id: "run", emoji: "🏃‍♂️", name: "Run", ready: true },
  { id: "bike", emoji: "🚴", name: "Bike", ready: true },
  { id: "paddle", emoji: "🛶", name: "Paddle", ready: false },
  { id: "ski", emoji: "⛷️", name: "Ski", ready: true, recordOnly: true },
  { id: "gym", emoji: "🏋️", name: "Gym", ready: true, recordOnly: true },
];

const open = () => fireEvent.press(screen.getByRole("button", { name: "Sport, Run" }));

type Box = { width?: number; minHeight?: number; borderWidth?: number };
const boxOf = (id: string) =>
  StyleSheet.flatten(
    screen.getByTestId(`sport-tile-${id}`).props.style as Parameters<
      typeof StyleSheet.flatten
    >[0],
  ) as Box;

beforeEach(() => {
  jest.mocked(loadSport).mockReturnValue("run");
  jest.mocked(saveSport).mockClear();
});

test("the panel has a title, a «Close», and the sports by family, in order", async () => {
  await render(<SportButton sports={MIXED} />);
  await open();
  expect(screen.getByTestId("sport-panel")).toBeOnTheScreen();
  expect(screen.getByText("Sport")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Close" })).toBeOnTheScreen();
  const titles = screen.getAllByRole("header").map((h) => h.props.children);
  expect(titles).toEqual(["On foot", "On wheels", "On the water", "On snow", "Other"]);
  const foot = within(screen.getByTestId("sport-family-foot"));
  expect(foot.getByRole("radio", { name: "Walk" })).toBeOnTheScreen();
  expect(foot.getByRole("radio", { name: "Run" })).toBeChecked();
  const water = within(screen.getByTestId("sport-family-water"));
  expect(water.getByLabelText("Paddle, coming soon")).toBeOnTheScreen();
  expect(water.getByText("Soon")).toBeOnTheScreen();
  expect(
    within(screen.getByTestId("sport-family-other")).getByRole("radio", {
      name: "Gym",
    }),
  ).toBeOnTheScreen();
});

test("a family with no sport has no title", async () => {
  await render(<SportButton sports={MIXED.filter((s) => s.id !== "paddle")} />);
  await open();
  expect(screen.queryByText("On the water")).toBeNull();
  expect(screen.queryByTestId("sport-family-water")).toBeNull();
});

test("the tiles are large, two to a row, and the one chosen stands out", async () => {
  await render(<SportButton sports={MIXED} />);
  await open();
  // The test window is 750 wide: two tiles and their gap fill the panel.
  const width = tileWidth(750);
  expect(width).toBeGreaterThan(300);
  expect(boxOf("run").width).toBe(width);
  expect(boxOf("walk").width).toBe(width);
  expect(boxOf("paddle").width).toBe(width);
  expect(boxOf("run").minHeight).toBeGreaterThanOrEqual(44);
  expect(boxOf("run").borderWidth).toBe(2);
  expect(boxOf("walk").borderWidth).toBe(1);
  expect(screen.getAllByText("✓")).toHaveLength(1);
});

test.each([320, 375, 390, 393, 402, 428, 430, 440])(
  "on a phone %i wide two tiles fit in a row, the panel's edge counted",
  (window) => {
    const width = tileWidth(window);
    // The panel 16 from each side, its edge 1, 12 inside, 8 between the two.
    expect(width * 2 + 8 + 12 * 2 + 1 * 2 + 16 * 2).toBeLessThan(window);
    expect(width).toBeGreaterThanOrEqual(window === 320 ? 120 : 150);
  },
);

test("the tiles follow the panel's inside as laid out", async () => {
  await render(<SportButton sports={MIXED} />);
  await open();
  // The panel is laid out 356 wide inside: two tiles, the gap and the padding.
  await fireEvent(screen.getByTestId("sport-scroll"), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: 356, height: 500 } },
  });
  const width = boxOf("run").width ?? 0;
  expect(width).toBe(pairWidth(356));
  expect(width * 2 + 8 + 12 * 2).toBeLessThanOrEqual(356);
  expect(width).toBeGreaterThanOrEqual(160);
});

test("a tile chosen saves the sport and closes the panel", async () => {
  await render(<SportButton sports={MIXED} />);
  await open();
  await fireEvent.press(screen.getByRole("radio", { name: "Bike" }));
  expect(saveSport).toHaveBeenCalledWith("bike");
  expect(screen.queryByTestId("sport-panel")).toBeNull();
});

test("the dark around the panel closes it and changes nothing", async () => {
  await render(<SportButton sports={MIXED} />);
  await open();
  await fireEvent.press(screen.getByTestId("sport-backdrop"));
  expect(screen.queryByTestId("sport-panel")).toBeNull();
  expect(saveSport).not.toHaveBeenCalled();
});

test("every sport of the app has a family other than «Other» but gym and paragliding", () => {
  const groups = groupSports(SPORTS);
  const other = groups.find((g) => g.family === "other")?.sports.map((s) => s.id) ?? [];
  expect(other.every((id) => id === "gym" || id === "paragliding")).toBe(true);
  expect(groups.flatMap((g) => g.sports)).toHaveLength(SPORTS.length);
});

test("every sport of ALL_SPORTS has its own family, and is in one group only", () => {
  // A sport added without a family fails here (and in tsc), not in «Other».
  const families = new Set<string>(SPORT_FAMILIES.map((f) => f.id));
  for (const option of ALL_SPORTS) {
    expect(Object.prototype.hasOwnProperty.call(FAMILY_OF, option.id)).toBe(true);
    expect(families.has(FAMILY_OF[option.id])).toBe(true);
  }
  const placed = groupSports(ALL_SPORTS).flatMap((g) => g.sports.map((s) => s.id));
  expect(placed.slice().sort()).toEqual(ALL_SPORTS.map((s) => s.id).sort());
  expect(new Set(placed).size).toBe(placed.length);
});

test("a «Soon» tile cannot be chosen: a tap saves nothing and keeps the panel", async () => {
  await render(<SportButton sports={MIXED} />);
  await open();
  const soon = screen.getByLabelText("Paddle, coming soon");
  expect(soon.props.accessibilityRole).toBeUndefined();
  expect(soon.props.onPress).toBeUndefined();
  await fireEvent.press(soon);
  expect(saveSport).not.toHaveBeenCalled();
  expect(screen.getByTestId("sport-panel")).toBeOnTheScreen();
});

test("VoiceOver reads each tile's name and state, never the emoji alone", async () => {
  await render(<SportButton />);
  await open();
  for (const option of SPORTS) {
    const tile = screen.getByTestId(`sport-tile-${option.id}`);
    if (option.ready) {
      expect(tile.props.accessibilityRole).toBe("radio");
      expect(tile.props.accessibilityLabel).toBe(option.name);
      expect(tile.props.accessibilityState).toEqual({ checked: option.id === "run" });
    } else {
      expect(tile.props.accessible).toBe(true);
      expect(tile.props.accessibilityLabel).toBe(`${option.name}, coming soon`);
    }
  }
  // The family titles are headers, the panel a group of radios.
  expect(screen.getByTestId("sport-panel").props.accessibilityRole).toBe("radiogroup");
  expect(screen.getAllByRole("header").length).toBeGreaterThanOrEqual(4);
});

test("on a small phone the panel scrolls: its tiles are taller than it", async () => {
  // iPhone SE: 375 × 667, the panel under a header at 20 + 8 + 44 + 4.
  const max = panelMaxHeight(667, 76, 0);
  const rows = groupSports(SPORTS).reduce(
    (sum, g) => sum + Math.ceil(g.sports.length / 2),
    0,
  );
  const tiles = rows * tileHeight(tileWidth(375));
  expect(tiles).toBeGreaterThan(max);
  await render(<SportButton />);
  await open();
  const panel = StyleSheet.flatten(
    screen.getByTestId("sport-panel").props.style as Parameters<
      typeof StyleSheet.flatten
    >[0],
  ) as { maxHeight?: number };
  expect(panel.maxHeight).toBeGreaterThan(0);
  expect(screen.getByTestId("sport-scroll")).toBeOnTheScreen();
  // Every sport is in the scroll, the last ones too.
  for (const option of SPORTS) {
    expect(
      within(screen.getByTestId("sport-scroll")).getByTestId(`sport-tile-${option.id}`),
    ).toBeOnTheScreen();
  }
});
