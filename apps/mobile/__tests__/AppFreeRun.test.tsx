/**
 * A run without a route (TASK-149): «Run» on the first screen records the
 * track, Stop shows it, Done forgets it. The rest of the app is in
 * App.test.tsx.
 */
import type { LatLon } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Location from "expo-location";

import App from "../App";
import { clearRun, loadRun, saveRun } from "../src/navigation/trackStore";

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

const { injectJavaScript } =
  jest.requireMock<typeof import("../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

const START: LatLon = [46.067, 11.1215];
const METRE = 1 / 111_195;

let onPosition: (position: Location.LocationObject) => void = () => {};
let fetchSpy: jest.SpiedFunction<typeof fetch>;

function position(northM: number, timeMs: number) {
  return {
    coords: { latitude: START[0] + northM * METRE, longitude: START[1], accuracy: 5 },
    timestamp: timeMs,
  } as Location.LocationObject;
}

function scripts(type: string): string[] {
  return injectJavaScript.mock.calls
    .map(([script]) => String(script))
    .filter((script) => script.includes(`"type":"${type}"`));
}

beforeEach(() => {
  clearRun();
  injectJavaScript.mockClear();
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: true } as Location.LocationPermissionResponse);
  jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
    coords: { latitude: START[0], longitude: START[1] },
  } as Location.LocationObject);
  jest
    .mocked(Location.watchPositionAsync)
    .mockImplementation(async (_options, callback) => {
      onPosition = callback;
      return { remove: jest.fn() };
    });
  // Nothing of a free run goes to the API.
  fetchSpy = jest
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () => Response.json({}, { status: 404 }));
});

afterEach(() => {
  fetchSpy.mockRestore();
});

async function openApp() {
  await render(<App />);
  await screen.findByText("Starting from your position.");
  await fireEvent(screen.getByTestId("map"), "message", {
    nativeEvent: { data: '{"type":"ready"}' },
  });
}

test("the button says what it starts: a run without a route", async () => {
  await openApp();
  // Written in full: "Run" alone read as running the route chosen below.
  expect(screen.getByText("Run without a route")).toBeOnTheScreen();
  expect(screen.queryByText("Run")).toBeNull();
  expect(screen.getByRole("button", { name: "Run without a route" })).toBeOnTheScreen();
});

test("Run records a run without a route, and Stop shows it", async () => {
  await openApp();
  await fireEvent.press(screen.getByLabelText("Run without a route"));

  expect(await screen.findByText("Finding your position…")).toBeOnTheScreen();
  expect(screen.getByText("Stop")).toBeOnTheScreen();
  const now = Date.now();
  await act(async () => {
    onPosition(position(0, now - 60_000));
    onPosition(position(150, now - 30_000));
    onPosition(position(300, now));
  });
  expect(screen.getByText("0.30 km")).toBeOnTheScreen();
  // The map follows the runner and draws the line so far.
  expect(scripts("follow").length).toBeGreaterThan(0);
  expect(scripts("showTrack").at(-1)).toContain(
    `[${START[1]},${START[0] + 300 * METRE}]`,
  );
  expect(scripts("showRoute")).toHaveLength(0);

  await fireEvent.press(screen.getByText("Stop"));
  expect(await screen.findByText("Your run")).toBeOnTheScreen();
  expect(screen.getByText("0.30 km")).toBeOnTheScreen();
  expect(screen.getByText("1:00 · 3:20 /km")).toBeOnTheScreen();
  expect(loadRun()?.route).toEqual([]);
  expect(fetchSpy).not.toHaveBeenCalledWith(
    expect.stringContaining("/track-scores"),
    expect.anything(),
  );

  // Done: back to the first screen, and the run leaves the phone.
  await fireEvent.press(screen.getByText("Done"));
  expect(await screen.findByText("Starting from your position.")).toBeOnTheScreen();
  expect(loadRun()).toBeNull();
});

test("Keep running goes on with the same track", async () => {
  await openApp();
  await fireEvent.press(screen.getByLabelText("Run without a route"));
  await screen.findByText("Stop");
  const now = Date.now();
  await act(async () => {
    onPosition(position(0, now - 20_000));
    onPosition(position(100, now));
  });
  await fireEvent.press(screen.getByText("Stop"));
  await fireEvent.press(await screen.findByText("Keep running"));

  await screen.findByText("Stop");
  await act(async () => {
    onPosition(position(200, now + 20_000));
  });
  expect(screen.getByText("0.20 km")).toBeOnTheScreen();
  expect(loadRun()?.track.fixes).toHaveLength(3);
});

test("Stop before the first fix goes back to the first screen", async () => {
  await openApp();
  await fireEvent.press(screen.getByLabelText("Run without a route"));
  await fireEvent.press(await screen.findByText("Stop"));
  expect(await screen.findByText("Starting from your position.")).toBeOnTheScreen();
  expect(screen.queryByText("Your run")).toBeNull();
});

test("a free run left when the app closed opens with the app", async () => {
  const now = Date.now();
  saveRun({
    version: 1,
    route: [],
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
    status: "running",
  });
  await render(<App />);
  expect(await screen.findByText("Your run")).toBeOnTheScreen();
  expect(screen.getByText("0.50 km")).toBeOnTheScreen();
  expect(screen.getByText("Keep running")).toBeOnTheScreen();
});
