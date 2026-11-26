import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Location from "expo-location";

import App from "../../App";
import type { MemorySecureStore } from "../account/testing";
import { loadSport, saveSport } from "../settings/sport";

// «Food» in the training mode's bar (TASK-490 part D, ADR-0398): with
// «Nutrition» on (TASK-489's NUTRITION_ON, off in the code until it ships)
// the bar of «Gym» is «Feed · Today · Workouts · Food · Profile», and
// «Food» is the «Nutrition» page as it is. The setup is
// `./trainingModeShell.test.tsx`'s: no GPS, no account, nothing asked of
// the API.

jest.mock("react-native-webview");
jest.mock("../nutrition/nutritionOn", () => ({ NUTRITION_ON: true }));
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { hostUri: "192.168.1.23:8081" } },
}));
jest.mock("expo-file-system");
jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));
// The sport kept on the phone, as each test says; saving, and telling the
// app, are the real ones (as in `../settings/SportButton.test.tsx`).
jest.mock("../settings/sport", () => {
  const actual =
    jest.requireActual<typeof import("../settings/sport")>("../settings/sport");
  return { ...actual, loadSport: jest.fn(() => "run") };
});
jest.mock("expo-secure-store", () =>
  jest
    .requireActual<typeof import("../account/testing")>("../account/testing")
    .memorySecureStore(),
);

const store = jest.requireMock<MemorySecureStore>("expo-secure-store");
let fetchSpy: jest.SpiedFunction<typeof fetch>;

beforeEach(() => {
  store.kept.clear();
  fetchSpy = jest.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    throw new Error(`Not in this test: ${String(input)}`);
  });
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: false } as never);
});

afterEach(async () => {
  fetchSpy.mockRestore();
  await act(async () => saveSport("run"));
});

/** The names of the tabs of the bar, as the screen reader reads them. */
function tabs(): string[] {
  return screen
    .getAllByRole("tab")
    .map((tab) => String(tab.props.accessibilityLabel ?? ""));
}

test("with «Nutrition» on, «Gym» has «Food» after «Workouts», and it opens «Nutrition»", async () => {
  jest.mocked(loadSport).mockReturnValue("gym");
  await render(<App />);
  expect(tabs()).toEqual(["Feed", "Today", "Workouts", "Food", "Profile"]);
  await fireEvent.press(screen.getByRole("tab", { name: "Food" }));
  expect(await screen.findByTestId("nutrition-page")).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Nutrition" })).toBeOnTheScreen();
});

test("leaving «Gym» from «Food» lands on «Draw» with the app's bar", async () => {
  jest.mocked(loadSport).mockReturnValue("gym");
  await render(<App />);
  await fireEvent.press(screen.getByRole("tab", { name: "Food" }));
  await screen.findByTestId("nutrition-page");
  await act(async () => saveSport("run"));
  expect(tabs()).not.toContain("Food");
  expect(screen.queryByTestId("nutrition-page")).toBeNull();
});
