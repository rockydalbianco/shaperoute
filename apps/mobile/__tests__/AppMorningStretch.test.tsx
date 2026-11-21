/**
 * The morning stretching (TASK-466 part D): a touch on the notification of
 * «Morning stretch» opens the «Morning» routine of its length over the app,
 * at once; never over a run. The setting and the notifications themselves
 * are tested in src/stretch.
 */
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Location from "expo-location";

import App from "../App";
import { clearRun } from "../src/navigation/trackStore";

jest.mock("expo-notifications");
jest.mock("react-native-webview");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { hostUri: "192.168.1.23:8081" } },
}));
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return {
    File,
    Paths: {
      document: { uri: "file:///documents/" },
      cache: { uri: "file:///cache/" },
    },
  };
});
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));
jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3, BestForNavigation: 6 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));
jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock("expo-brightness", () => ({
  getBrightnessAsync: jest.fn(() => Promise.resolve(0.6)),
  setBrightnessAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));
const mockPlay = jest.fn();
jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn(() => ({
    play: mockPlay,
    seekTo: () => Promise.resolve(),
  })),
}));

type Phone = typeof import("../__mocks__/expo-notifications");
const phone = jest.requireMock<Phone>("expo-notifications");

let fetchSpy: jest.SpiedFunction<typeof fetch>;

beforeEach(() => {
  jest.useFakeTimers({ now: new Date("2026-11-13T06:05:00Z") });
  clearRun();
  phone.resetPhone();
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: true } as Location.LocationPermissionResponse);
  jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
    coords: { latitude: 46.067, longitude: 11.1215 },
  } as Location.LocationObject);
  jest
    .mocked(Location.watchPositionAsync)
    .mockImplementation(async () => ({ remove: jest.fn() }));
  fetchSpy = jest
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () => Response.json({}, { status: 404 }));
});

afterEach(() => {
  fetchSpy.mockRestore();
  jest.useRealTimers();
});

test("a touch on the morning notification opens the Morning routine over the app", async () => {
  await render(<App />);
  await screen.findByText("Starting from your position.");
  await act(async () => phone.tap({ kind: "morning_stretch", minutes: 3 }));
  expect(await screen.findByText("1 of 6")).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Overhead reach" })).toBeOnTheScreen();
  expect(screen.queryByText("How long?")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "End" }));
  expect(screen.queryByText("1 of 6")).toBeNull();
  expect(screen.getByText("Starting from your position.")).toBeOnTheScreen();
});

test("the notification that opened the app opens the routine too", async () => {
  phone.phone.last = phone.response({ kind: "morning_stretch", minutes: 10 });
  await render(<App />);
  expect(await screen.findByText("1 of 10")).toBeOnTheScreen();
});

test("during a run the touch opens nothing", async () => {
  await render(<App />);
  await screen.findByText("Starting from your position.");
  await fireEvent(screen.getByTestId("map"), "message", {
    nativeEvent: { data: '{"type":"ready"}' },
  });
  await fireEvent.press(screen.getByLabelText("Run without a route"));
  await screen.findByText("Finding your position…");
  await act(async () => phone.tap({ kind: "morning_stretch", minutes: 3 }));
  expect(screen.queryByText("1 of 6")).toBeNull();
});
