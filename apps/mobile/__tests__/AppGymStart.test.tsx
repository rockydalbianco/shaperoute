/**
 * «Start workout» in «Draw» with «Gym» (TASK-385 B): the workout opens over
 * the app at once, on the catalog. Its screen was inside the map's card,
 * which has nothing while «Draw» shows: the button started a workout nobody
 * saw (reported by the user on 2026-11-06). The screen alone is in
 * src/gym/GymWorkoutHost.test.tsx.
 */
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Location from "expo-location";

import App from "../App";
import { forgetHeldWorkout } from "../src/gym/useWorkout";
import { loadSport } from "../src/settings/sport";

// The whole app, loaded cold.
jest.setTimeout(20_000);

jest.mock("react-native-webview");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { hostUri: "192.168.1.23:8081" } },
}));
// The phone's documents folder, in memory: the workout is kept there.
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
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});
jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3, BestForNavigation: 6 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));
jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
  useKeepAwake: jest.fn(),
}));
jest.mock("../src/settings/sport", () => ({
  ...jest.requireActual<typeof import("../src/settings/sport")>(
    "../src/settings/sport",
  ),
  loadSport: jest.fn(),
}));

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");

beforeEach(() => {
  jest.useFakeTimers();
  files.clear();
  forgetHeldWorkout();
  jest.mocked(loadSport).mockReturnValue("gym");
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: true } as Location.LocationPermissionResponse);
  jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
    coords: { latitude: 46.07, longitude: 11.12 },
  } as Location.LocationObject);
  jest
    .mocked(Location.watchPositionAsync)
    .mockResolvedValue({ remove: jest.fn() } as Location.LocationSubscription);
  jest
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () =>
      Response.json(
        { error: { code: "http_error", message: "none" } },
        { status: 404 },
      ),
    );
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test("«Start workout» in «Draw» opens the workout on the catalog", async () => {
  await render(<App />);
  await act(() => jest.advanceTimersByTimeAsync(0));
  expect(screen.queryByTestId("exercise-picker")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Start workout" }));
  await act(() => jest.advanceTimersByTimeAsync(0));
  expect(screen.getByTestId("exercise-picker")).toBeOnTheScreen();
});
