/**
 * The end of a run belongs to the account that ran it (TASK-507 part B2,
 * the user's choice «Nascosta finché rientra»): with the app open, another
 * account signing in does not see it; it waits on the phone, set aside
 * (trackStore), and shows again when its account signs in.
 */
import type { LatLon } from "@shaperoute/shared-types";
import { act, render, screen } from "@testing-library/react-native";
import * as Location from "expo-location";

import App from "../App";
import { setCurrentOwner } from "../src/account/currentOwner";
import { clearRun, saveRun } from "../src/navigation/trackStore";

jest.mock("react-native-webview");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { hostUri: "192.168.1.23:8081" } },
}));
// The phone's documents folder, in memory, as after closing the app.
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
    files,
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

const disk = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const ASIDE = "file:///documents/current-run.11.json";

const START: LatLon = [46.067, 11.1215];
const METRE = 1 / 111_195;
const BEGAN = new Date("2026-10-02T08:00:00Z");
const A = 11;
const B = 22;

let fetchSpy: jest.SpiedFunction<typeof fetch>;

beforeEach(() => {
  jest.useFakeTimers({ now: BEGAN });
  clearRun();
  setCurrentOwner(null);
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: true } as Location.LocationPermissionResponse);
  jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
    coords: { latitude: START[0], longitude: START[1] },
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

/** A free run of 500 m that A stopped and did not save yet. */
function aLeftARun(): void {
  const now = Date.now();
  saveRun({
    version: 1,
    route: [],
    owner: A,
    track: {
      fixes: [
        { point: START, timeMs: now - 120_000, accuracyM: 5 },
        {
          point: [START[0] + 500 * METRE, START[1]],
          timeMs: now - 60_000,
          accuracyM: 5,
        },
      ],
      distanceM: 500,
    },
    status: "stopped",
  });
}

test("A's run left on the phone: hidden with nobody signed in, shown to A, hidden again from B", async () => {
  aLeftARun();
  await render(<App />);
  expect(await screen.findByText("Starting from your position.")).toBeOnTheScreen();
  expect(screen.queryByText("Your run")).toBeNull();
  expect(disk.files.has(ASIDE)).toBe(true);

  await act(async () => setCurrentOwner(A));
  expect(await screen.findByText("Your run")).toBeOnTheScreen();
  expect(disk.files.has(ASIDE)).toBe(false);

  // B signs in with A's run on screen: it leaves the screen, and waits.
  await act(async () => setCurrentOwner(B));
  expect(screen.queryByText("Your run")).toBeNull();
  expect(await screen.findByText("Starting from your position.")).toBeOnTheScreen();
  expect(disk.files.has(ASIDE)).toBe(true);

  await act(async () => setCurrentOwner(A));
  expect(await screen.findByText("Your run")).toBeOnTheScreen();
});
