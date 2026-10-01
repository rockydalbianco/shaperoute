import type { LatLon } from "@shaperoute/shared-types";
import { act, renderHook } from "@testing-library/react-native";
import * as Location from "expo-location";
import * as Speech from "expo-speech";

import { FREE_ROUTE } from "./freeRun";
import { clearRun, loadRun, saveRun } from "./trackStore";
import { useFreeRun } from "./useFreeRun";

jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock("expo-location", () => ({
  Accuracy: { BestForNavigation: 6 },
  requestForegroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));
// The phone's documents folder, in memory.
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
  return { File, Paths: { document: { uri: "file:///documents/" } } };
});

const START: LatLon = [46.0122, 11.2986];
const METRE = 1 / 111_195;

function position(northM: number, seconds: number, accuracy: number) {
  return {
    coords: { latitude: START[0] + northM * METRE, longitude: START[1], accuracy },
    timestamp: seconds * 1000,
  } as Location.LocationObject;
}

function permission(granted: boolean) {
  return { granted } as Location.LocationPermissionResponse;
}

test("the fixes of a free run are its track, kept on the phone with no route", async () => {
  let onPosition: (position: Location.LocationObject) => void = () => {};
  const remove = jest.fn();
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue(permission(true));
  jest
    .mocked(Location.watchPositionAsync)
    .mockImplementation(async (_options, callback) => {
      onPosition = callback;
      return { remove };
    });

  const { result, unmount } = await renderHook(() => useFreeRun(true));
  expect(result.current).toEqual({
    status: "running",
    track: { fixes: [], distanceM: 0 },
    position: null,
  });
  await act(async () => {
    onPosition(position(0, 0, 5));
    onPosition(position(10, 4, 5));
    onPosition(position(20, 8, 90));
    onPosition(position(30, 12, 5));
  });
  const state = result.current;
  expect(state.status).toBe("running");
  if (state.status === "running") {
    // The fix 90 m wrong is left out of the line; the map follows the last.
    expect(state.track.fixes.map((fix) => fix.timeMs)).toEqual([0, 4000, 12_000]);
    expect(state.track.distanceM).toBeCloseTo(30, 0);
    expect(state.position).toEqual([START[0] + 30 * METRE, START[1]]);
  }
  await unmount();

  expect(remove).toHaveBeenCalled();
  const run = loadRun();
  expect(run?.route).toEqual([]);
  expect(run?.status).toBe("stopped");
  expect(run?.similarity).toBeUndefined();
  expect(run?.track.fixes).toHaveLength(3);
});

test("without the permission nothing is recorded", async () => {
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue(permission(false));
  jest.mocked(Location.watchPositionAsync).mockClear();
  const { result } = await renderHook(() => useFreeRun(true));
  expect(result.current).toEqual({ status: "denied" });
  expect(Location.watchPositionAsync).not.toHaveBeenCalled();
});

test("not active, it does not ask for the GPS", async () => {
  jest.mocked(Location.requestForegroundPermissionsAsync).mockClear();
  const { result } = await renderHook(() => useFreeRun(false));
  expect(result.current).toEqual({ status: "starting" });
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
});

/** Positions as the GPS gives them, to the hook running in the test. */
async function runningHook() {
  let onPosition: (position: Location.LocationObject) => void = () => {};
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue(permission(true));
  jest
    .mocked(Location.watchPositionAsync)
    .mockImplementation(async (_options, callback) => {
      onPosition = callback;
      return { remove: jest.fn() };
    });
  const hook = await renderHook(() => useFreeRun(true));
  return { ...hook, at: (position: Location.LocationObject) => onPosition(position) };
}

test("the voice says each kilometre once, as it is passed", async () => {
  clearRun();
  jest.mocked(Speech.speak).mockClear();
  const { at, unmount } = await runningHook();
  await act(async () => {
    at(position(0, 0, 5));
    at(position(600, 180, 5));
    at(position(990, 297, 5));
  });
  expect(Speech.speak).not.toHaveBeenCalled();
  await act(async () => {
    at(position(1005, 300, 5));
    at(position(1400, 420, 5));
  });
  expect(Speech.speak).toHaveBeenCalledTimes(1);
  expect(Speech.speak).toHaveBeenCalledWith(
    "1 kilometre. Time: 5 minutes. Average pace: 4 minutes 59 seconds per kilometre.",
    { language: "en-US" },
  );
  await act(async () => {
    at(position(2001, 600, 5));
  });
  expect(Speech.speak).toHaveBeenCalledTimes(2);
  expect(jest.mocked(Speech.speak).mock.calls[1][0]).toMatch(/^2 kilometres\. /);
  await unmount();
  expect(Speech.stop).toHaveBeenCalled();
});

test("a run that goes on does not say again the kilometres it has said", async () => {
  const now = Date.now();
  const fixAt = (northM: number, ago: number) => ({
    point: [START[0] + northM * METRE, START[1]] as LatLon,
    timeMs: now - ago,
    accuracyM: 5,
  });
  saveRun({
    version: 1,
    route: FREE_ROUTE,
    track: { fixes: [fixAt(0, 600_000), fixAt(1500, 60_000)], distanceM: 1500 },
    status: "stopped",
  });
  jest.mocked(Speech.speak).mockClear();
  const { at, unmount } = await runningHook();
  await act(async () => {
    at(position(1600, (now + 20_000) / 1000, 5));
  });
  expect(Speech.speak).not.toHaveBeenCalled();
  await act(async () => {
    at(position(2050, (now + 160_000) / 1000, 5));
  });
  expect(Speech.speak).toHaveBeenCalledTimes(1);
  expect(jest.mocked(Speech.speak).mock.calls[0][0]).toMatch(/^2 kilometres\. /);
  await unmount();
});
