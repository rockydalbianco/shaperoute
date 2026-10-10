/**
 * What a run without a route keeps of the sport (TASK-251 part C): the one
 * «Settings» has when it starts goes in the run's file, so its end shows a
 * ride's speeds or a paddler's numbers; a run's file is as before.
 */
import type { LatLon } from "@shaperoute/shared-types";
import { act, renderHook } from "@testing-library/react-native";
import * as Location from "expo-location";
import * as Speech from "expo-speech";

import { saveSport, type Sport } from "../settings/sport";
import { freeRunActivity } from "./freeSport";
import { skipCountdown } from "./runControl";
import { clearRun, loadRun } from "./trackStore";
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

function position(northM: number, seconds: number) {
  return {
    coords: { latitude: START[0] + northM * METRE, longitude: START[1], accuracy: 5 },
    timestamp: seconds * 1000,
  } as Location.LocationObject;
}

/** A free run of 1.1 km with `sport` in «Settings», a fix every 50 m at
 * 20 km/h; «run» again after it. */
async function freeRunWith(sport: Sport): Promise<void> {
  saveSport(sport);
  clearRun();
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
  try {
    const { unmount } = await renderHook(() => useFreeRun(true));
    await act(async () => {
      skipCountdown();
      for (let m = 0; m <= 1100; m += 50) {
        onPosition(position(m, m * 0.18));
      }
    });
    await unmount();
  } finally {
    saveSport("run");
  }
}

test("a sport's activity without a route: a run has none", () => {
  expect(freeRunActivity("running")).toBeUndefined();
  expect(freeRunActivity("cycling")).toBe("cycling");
  expect(freeRunActivity("paddling")).toBe("paddling");
});

test("with «Bike» in «Settings» the ride's file says so", async () => {
  await freeRunWith("bike");
  const run = loadRun();
  expect(run?.track.fixes.length).toBeGreaterThan(2);
  expect(run?.activity).toBe("cycling");
});

test("with «Paddle» the file says so, as before; a run's has no sport", async () => {
  await freeRunWith("paddle");
  expect(loadRun()?.activity).toBe("paddling");
  await freeRunWith("run");
  expect(loadRun()).not.toBeNull();
  expect(loadRun()).not.toHaveProperty("activity");
});

test("on a bike the voice still says each kilometre with its pace", async () => {
  jest.mocked(Speech.speak).mockClear();
  await freeRunWith("bike");
  const said = jest.mocked(Speech.speak).mock.calls.map(([text]) => text);
  expect(said.some((text) => /^1 kilometre\. /.test(text))).toBe(true);
});
