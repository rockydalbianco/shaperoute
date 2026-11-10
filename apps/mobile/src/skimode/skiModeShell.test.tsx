import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Location from "expo-location";

import App from "../../App";
import type { MemorySecureStore } from "../account/testing";
import { loadSport, saveSport } from "../settings/sport";

// The ski mode in the app itself (TASK-429 part A, ADR-0357): with «Ski»
// the tab bar is «Today · Days · Resorts · Feed · Profile» with «Messages»
// in the header; another sport brings the app back as always. The setup is
// `../units/DrawDistanceApp.test.tsx`'s: no GPS, no account, nothing asked
// of the API.

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

test("with «Ski» the app opens on «Today», with the ski mode's tabs", async () => {
  jest.mocked(loadSport).mockReturnValue("ski");
  await render(<App />);
  expect(tabs()).toEqual(["Today", "Days", "Resorts", "Feed", "Profile"]);
  expect(screen.getByRole("header", { name: "Today" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Record your day" })).toBeOnTheScreen();
  // «Messages» has no tab here: it is in the header.
  expect(screen.getByTestId("ski-messages")).toBeOnTheScreen();
});

test("another sport brings the app back as always, and «Ski» again the ski mode", async () => {
  jest.mocked(loadSport).mockReturnValue("run");
  await render(<App />);
  const always = tabs();
  expect(always).not.toContain("Today");
  expect(screen.queryByTestId("ski-messages")).toBeNull();

  await act(async () => saveSport("ski"));
  expect(tabs()).toEqual(["Today", "Days", "Resorts", "Feed", "Profile"]);
  expect(screen.getByRole("header", { name: "Today" })).toBeOnTheScreen();

  await act(async () => saveSport("run"));
  expect(tabs()).toEqual(always);
  expect(screen.queryByTestId("ski-messages")).toBeNull();
});

test("without an account, «Messages» of the header goes to «Profile», as its tab did", async () => {
  jest.mocked(loadSport).mockReturnValue("ski");
  await render(<App />);
  expect(screen.getByRole("tab", { name: "Today" })).toBeSelected();
  await fireEvent.press(screen.getByTestId("ski-messages"));
  expect(screen.queryByTestId("ski-messages-page")).toBeNull();
  expect(screen.getByRole("tab", { name: "Profile" })).toBeSelected();
});
