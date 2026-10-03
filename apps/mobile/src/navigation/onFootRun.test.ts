/**
 * A bike route with the bike on foot, ridden (TASK-206): positions
 * simulated along it, through the navigation as the run screen uses it. The
 * voice says the stretch 100 m ahead, as far as a turn on a bike (TASK-216),
 * and its end, once each; the recording goes on, the stretch is part of the
 * drawing.
 */
import type { Direction, LatLon, Stretch } from "@shaperoute/shared-types";
import { act, renderHook } from "@testing-library/react-native";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { Vibration } from "react-native";

import { runControl, skipCountdown } from "./runControl";
import { clearRun } from "./trackStore";
import { useNavigation } from "./useNavigation";

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
/** When each test begins, on the clock the tests move by hand. */
const BEGAN = Date.UTC(2026, 9, 3, 7, 0, 0);

/** North in a line, a point every 100 m to 1300 m; on foot from 300 to
 * 500 m. */
const ROUTE: LatLon[] = Array.from({ length: 14 }, (_, i) => [
  START[0] + i * 100 * METRE,
  START[1],
]);
const ON_FOOT: Stretch[] = [[3, 5]];
const NO_DIRECTIONS: Direction[] = [];

let onPosition: (position: Location.LocationObject) => void = () => {};

/** The rider `northM` along, at 6 m a second. */
function position(northM: number) {
  return {
    coords: {
      latitude: START[0] + northM * METRE,
      longitude: START[1],
      accuracy: 5,
      altitude: null,
    },
    timestamp: BEGAN + Math.round(northM / 6) * 1000,
  } as Location.LocationObject;
}

/** Rides from `fromM` to `toM`, a fix every 10 m. */
function rideTo(fromM: number, toM: number) {
  for (let m = fromM; m <= toM; m += 10) {
    onPosition(position(m));
  }
}

function said(): string[] {
  return jest.mocked(Speech.speak).mock.calls.map(([text]) => text);
}

// The cues vibrate (useNavigation.play): not in a test.
jest.spyOn(Vibration, "vibrate").mockImplementation(() => {});

beforeEach(() => {
  jest.useFakeTimers({ now: BEGAN });
  clearRun();
  jest.mocked(Speech.speak).mockClear();
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: true } as Location.LocationPermissionResponse);
  jest
    .mocked(Location.watchPositionAsync)
    .mockImplementation(async (_options, callback) => {
      onPosition = callback;
      return { remove: jest.fn() };
    });
});

afterEach(() => {
  jest.useRealTimers();
});

/** Navigation along ROUTE with `onFoot`, past its countdown. */
async function startRiding(onFoot?: Stretch[]) {
  const hook = await renderHook(() =>
    useNavigation(ROUTE, NO_DIRECTIONS, true, 0.9, { onFoot, activity: "cycling" }),
  );
  // The permission and the GPS are asked for first.
  await act(async () => {});
  expect(runControl().phase).toBe("countdown");
  await act(async () => {
    skipCountdown();
  });
  return hook;
}

test("the stretch on foot is said 100 m ahead and at its end, once each", async () => {
  const { result, unmount } = await startRiding(ON_FOOT);
  await act(async () => {
    rideTo(0, 190);
  });
  expect(said().filter((words) => /bike/.test(words))).toEqual([]);
  await act(async () => {
    rideTo(200, 1300);
  });
  const bike = said().filter((words) => /bike/.test(words));
  expect(bike).toEqual([
    "In 100 metres, get off and walk the bike for 200 metres.",
    "Back on the bike.",
  ]);
  // No pause: the stretch is ridden, walked, and recorded.
  const state = result.current;
  if (state.status !== "following") {
    throw new Error(`not following: ${state.status}`);
  }
  expect(state.track.pauses ?? []).toEqual([]);
  unmount();
});

test("a route without stretches on foot says nothing of the bike", async () => {
  const { unmount } = await startRiding();
  await act(async () => {
    rideTo(0, 1300);
  });
  expect(said().filter((words) => /bike/.test(words))).toEqual([]);
  unmount();
});
