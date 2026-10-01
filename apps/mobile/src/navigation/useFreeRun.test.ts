import type { LatLon } from "@shaperoute/shared-types";
import { act, renderHook } from "@testing-library/react-native";
import * as Location from "expo-location";

import { loadRun } from "./trackStore";
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
