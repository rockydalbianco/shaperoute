import { act, fireEvent, render, screen, within } from "@testing-library/react-native";

import { saveSport } from "../settings/sport";
import { SportButton } from "../settings/SportButton";
import { forgetNutrition } from "./useNutrition";

// The page stands still, as with «Reduce Motion»: its numbers are there at
// once. What moves is tried in CountUp.test.tsx and Ring.test.tsx.
jest.mock("../ui/useReduceMotion", () => ({ useReduceMotion: () => true }));

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-file-system");
jest.mock("../settings/sport", () => {
  const actual =
    jest.requireActual<typeof import("../settings/sport")>("../settings/sport");
  return {
    ...actual,
    loadSport: jest.fn(() => "run"),
    saveSport: jest.fn(),
  };
});
// «Nutrition» as it will be with the native build: on.
jest.mock("./nutritionOn", () => ({ NUTRITION_ON: true }));

afterEach(async () => {
  await act(async () => forgetNutrition());
  jest.mocked(saveSport).mockClear();
});

const openPanel = () =>
  fireEvent.press(screen.getByRole("button", { name: "Sport, Run" }));

test("«Nutrition» is a family of its own, after the sports", async () => {
  await render(<SportButton />);
  await openPanel();
  const titles = screen.getAllByRole("header").map((header) => header.props.children);
  expect(titles[titles.length - 1]).toBe("Food");
  const food = within(screen.getByTestId("sport-family-food"));
  // A button, not one of the sports to choose from.
  expect(food.getByRole("button", { name: "Nutrition" })).toBeOnTheScreen();
  expect(food.queryByRole("radio")).toBeNull();
});

test("the tile opens the page and the sport stays the one chosen", async () => {
  await render(<SportButton />);
  await openPanel();
  expect(screen.queryByTestId("nutrition-page")).toBeNull();
  await fireEvent.press(screen.getByTestId("nutrition-tile"));
  expect(screen.getByTestId("nutrition-page")).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Before you start" })).toBeOnTheScreen();
  expect(saveSport).not.toHaveBeenCalled();
  expect(screen.getByRole("radio", { name: "Run" })).toBeChecked();
});

test("«Close» takes the page away and the panel is there again", async () => {
  await render(<SportButton />);
  await openPanel();
  await fireEvent.press(screen.getByTestId("nutrition-tile"));
  await fireEvent.press(screen.getByTestId("nutrition-close"));
  expect(screen.queryByTestId("nutrition-page")).toBeNull();
  expect(screen.getByTestId("sport-panel")).toBeOnTheScreen();
});
