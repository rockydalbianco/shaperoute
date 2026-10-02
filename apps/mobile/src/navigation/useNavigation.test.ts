import type { Direction, LatLon } from "@shaperoute/shared-types";
import { act, renderHook } from "@testing-library/react-native";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { Vibration } from "react-native";

import { setVoice, skipCountdown } from "./runControl";
import { clearRun, loadRun } from "./trackStore";
import { play, useNavigation, VIBRATE_MS } from "./useNavigation";

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

test("with the voice off, a turn still vibrates but nothing is said", () => {
  const vibrate = jest.spyOn(Vibration, "vibrate").mockImplementation(() => {});
  vibrate.mockClear();
  jest.mocked(Speech.speak).mockClear();
  setVoice(false);
  play([{ say: "In 50 metres, turn left onto Via Verdi", vibrate: true }]);
  setVoice(true);
  expect(Speech.speak).not.toHaveBeenCalled();
  expect(vibrate).toHaveBeenCalledWith(VIBRATE_MS);
  jest.mocked(Speech.speak).mockClear();
  vibrate.mockClear();
});

test("each cue is said in English, and a turn also vibrates", () => {
  const vibrate = jest.spyOn(Vibration, "vibrate").mockImplementation(() => {});
  play([
    { say: "Head out on Via Roma", vibrate: false },
    { say: "In 50 metres, turn left onto Via Verdi", vibrate: true },
  ]);
  expect(Speech.speak).toHaveBeenNthCalledWith(1, "Head out on Via Roma", {
    language: "en-US",
  });
  expect(Speech.speak).toHaveBeenNthCalledWith(
    2,
    "In 50 metres, turn left onto Via Verdi",
    { language: "en-US" },
  );
  expect(vibrate).toHaveBeenCalledTimes(1);
  expect(vibrate).toHaveBeenCalledWith(VIBRATE_MS);
});

test("the fixes of a navigation are the track of the run, kept on the phone", async () => {
  const start: LatLon = [46.0122, 11.2986];
  const metre = 1 / 111_195;
  const route: LatLon[] = [start, [start[0] + 1000 * metre, start[1]]];
  // The same array at every render: a new one would start navigation again.
  const NO_DIRECTIONS: Direction[] = [];
  let onPosition: (position: Location.LocationObject) => void = () => {};
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: true } as Location.LocationPermissionResponse);
  jest
    .mocked(Location.watchPositionAsync)
    .mockImplementation(async (_options, callback) => {
      onPosition = callback;
      return { remove: jest.fn() };
    });
  const position = (northM: number, seconds: number, accuracy: number) =>
    ({
      coords: { latitude: start[0] + northM * metre, longitude: start[1], accuracy },
      timestamp: seconds * 1000,
    }) as Location.LocationObject;

  const { result, unmount } = await renderHook(() =>
    useNavigation(route, NO_DIRECTIONS, true),
  );
  await act(async () => {
    // The countdown is over (TASK-169): every fix is of the run.
    skipCountdown();
    onPosition(position(0, 0, 5));
    onPosition(position(10, 4, 5));
    onPosition(position(20, 8, 90));
    onPosition(position(30, 12, 5));
  });
  // The screen has the same track, for the numbers of the run (TASK-164).
  const state = result.current;
  expect(state.status).toBe("following");
  if (state.status === "following") {
    expect(state.track.fixes.map((fix) => fix.timeMs)).toEqual([0, 4000, 12_000]);
    expect(state.track.distanceM).toBeCloseTo(30, 0);
  }
  await unmount();

  const run = loadRun();
  expect(run?.status).toBe("stopped");
  expect(run?.route).toEqual(route);
  expect(run?.track.fixes.map((fix) => fix.timeMs)).toEqual([0, 4000, 12_000]);
  expect(run?.track.distanceM).toBeCloseTo(30, 0);
});

test("along a route too, the voice says each kilometre (TASK-169)", async () => {
  clearRun();
  const start: LatLon = [46.0122, 11.2986];
  const metre = 1 / 111_195;
  const route: LatLon[] = [start, [start[0] + 3000 * metre, start[1]]];
  const NO_DIRECTIONS: Direction[] = [];
  let onPosition: (position: Location.LocationObject) => void = () => {};
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: true } as Location.LocationPermissionResponse);
  jest
    .mocked(Location.watchPositionAsync)
    .mockImplementation(async (_options, callback) => {
      onPosition = callback;
      return { remove: jest.fn() };
    });
  const position = (northM: number, seconds: number) =>
    ({
      coords: { latitude: start[0] + northM * metre, longitude: start[1], accuracy: 5 },
      timestamp: seconds * 1000,
    }) as Location.LocationObject;

  const { unmount } = await renderHook(() => useNavigation(route, NO_DIRECTIONS, true));
  await act(async () => {
    skipCountdown();
    onPosition(position(0, 0));
    onPosition(position(600, 180));
  });
  const said = () => jest.mocked(Speech.speak).mock.calls.map(([text]) => text);
  expect(said().filter((text) => text.includes("kilometre."))).toHaveLength(0);
  await act(async () => {
    onPosition(position(1005, 300));
  });
  expect(said()).toContain(
    "1 kilometre. Time: 5 minutes. Average pace: 4 minutes 59 seconds per kilometre.",
  );
  await unmount();
});
