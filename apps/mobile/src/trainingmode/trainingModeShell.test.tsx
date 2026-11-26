import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Location from "expo-location";

import App from "../../App";
import type { MemorySecureStore } from "../account/testing";
import { loadSport, saveSport } from "../settings/sport";

// The training mode in the app itself (TASK-490 part A, ADR-0398): with
// «Gym» the tab bar is «Feed · Today · Workouts · Profile» with «Messages»
// in the header; another sport brings the app back as always, «Ski» the ski
// mode. The setup is `../skimode/skiModeShell.test.tsx`'s: no GPS, no
// account, nothing asked of the API.

jest.mock("react-native-webview");
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

const TRAINING = ["Feed", "Today", "Workouts", "Profile"];

test("with «Gym» the app opens on «Today», with the training mode's tabs", async () => {
  jest.mocked(loadSport).mockReturnValue("gym");
  await render(<App />);
  expect(tabs()).toEqual(TRAINING);
  expect(screen.getByRole("header", { name: "Today" })).toBeOnTheScreen();
  expect(screen.getByTestId("gym-guide")).toBeOnTheScreen();
  // «Messages» has no tab here: it is in the header, as in the ski mode.
  expect(screen.getByTestId("ski-messages")).toBeOnTheScreen();
});

test("«Workouts» without an account asks to log in, and «Log in» goes to «Profile»", async () => {
  jest.mocked(loadSport).mockReturnValue("gym");
  await render(<App />);
  await fireEvent.press(screen.getByRole("tab", { name: "Workouts" }));
  expect(screen.getByRole("tab", { name: "Workouts" })).toBeSelected();
  await fireEvent.press(screen.getByTestId("training-log-in"));
  expect(screen.getByRole("tab", { name: "Profile" })).toBeSelected();
});

test("another sport brings the app back, «Ski» the ski mode, «Gym» this one", async () => {
  jest.mocked(loadSport).mockReturnValue("run");
  await render(<App />);
  const always = tabs();
  expect(always).not.toContain("Workouts");

  await act(async () => saveSport("gym"));
  expect(tabs()).toEqual(TRAINING);

  await act(async () => saveSport("ski"));
  expect(tabs()).toEqual(["Feed", "Today", "Days", "Resorts", "Profile"]);

  await act(async () => saveSport("gym"));
  await fireEvent.press(screen.getByRole("tab", { name: "Workouts" }));
  // Leaving the mode on «Workouts», a page the app has no more: «Draw».
  await act(async () => saveSport("run"));
  expect(tabs()).toEqual(always);
  expect(screen.queryByTestId("ski-messages")).toBeNull();
  expect(screen.queryByTestId("training-workouts")).toBeNull();
});

test("«Stretching» stays a sport like the others", async () => {
  jest.mocked(loadSport).mockReturnValue("stretch");
  await render(<App />);
  expect(tabs()).not.toContain("Workouts");
  expect(screen.queryByTestId("ski-messages")).toBeNull();
});

test("leaving the ski mode on «Days» lands on «Draw», with the bar", async () => {
  jest.mocked(loadSport).mockReturnValue("ski");
  await render(<App />);
  await fireEvent.press(screen.getByRole("tab", { name: "Days" }));
  await act(async () => saveSport("run"));
  expect(tabs()).not.toContain("Days");
  expect(screen.queryByTestId("ski-messages")).toBeNull();
});
