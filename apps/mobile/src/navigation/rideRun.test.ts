/**
 * A route followed by bike (TASK-216): positions simulated along it, through
 * the navigation as the run screen uses it. Turns said 100 m ahead, the
 * kilometres every 10 with the average speed, the way between two letters
 * ridden; a run along the same route says what a run says. From 20 km the
 * last 10 km are compared with the 10 before (TASK-217).
 */
import type { Activity, Direction, LatLon, Walk } from "@shaperoute/shared-types";
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
/** A metre north in degrees, a little over (the app's Earth is 6,371 km):
 * a fix at 10,000 m has ridden 10 km. */
const METRE = 1 / 111_194;
/** When each test begins, on the clock the tests move by hand. */
const BEGAN = Date.UTC(2026, 9, 3, 7, 0, 0);

/** North in a line, a point every 100 m to `metres`. */
function line(metres: number): LatLon[] {
  return Array.from({ length: metres / 100 + 1 }, (_, i) => [
    START[0] + i * 100 * METRE,
    START[1],
  ]);
}

function direction(turn: Direction["turn"], distance_m: number, street: string) {
  return {
    node: distance_m,
    point: [START[0] + distance_m * METRE, START[1]] as LatLon,
    distance_m,
    turn,
    angle_deg: 0,
    street,
    road_type: "residential",
    branches: 3,
    joined: false,
  };
}

const DIRECTIONS: Direction[] = [
  direction("depart", 0, "Via Roma"),
  direction("left", 400, "Via Verdi"),
];

let onPosition: (position: Location.LocationObject) => void = () => {};

/** Moves along at `metresPerSecond`, a fix every `everyM`, from `fromM` to
 * `toM`. */
function go(fromM: number, toM: number, metresPerSecond: number, everyM = 10) {
  for (let m = fromM; m <= toM; m += everyM) {
    onPosition({
      coords: {
        latitude: START[0] + m * METRE,
        longitude: START[1],
        accuracy: 5,
        altitude: null,
      },
      timestamp: BEGAN + Math.round((m / metresPerSecond) * 1000),
    } as Location.LocationObject);
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

/** Navigation along `route`, past its countdown. */
async function follow(
  route: LatLon[],
  options: { activity?: Activity; walks?: Walk[]; word?: string },
) {
  const hook = await renderHook(() =>
    useNavigation(route, DIRECTIONS, true, 0.9, options),
  );
  // The permission and the GPS are asked for first.
  await act(async () => {});
  expect(runControl().phase).toBe("countdown");
  await act(async () => {
    skipCountdown();
  });
  return hook;
}

/** 25 km/h, in metres a second. */
const RIDING = 25 / 3.6;
/** 6:00 a km. */
const RUNNING = 1000 / 360;

test("by bike a turn is said 100 m ahead", async () => {
  const { unmount } = await follow(line(1000), { activity: "cycling" });
  await act(async () => {
    go(0, 290, RIDING);
  });
  expect(said()).toEqual(["Head out on Via Roma"]);
  await act(async () => {
    go(300, 500, RIDING);
  });
  expect(said()).toEqual([
    "Head out on Via Roma",
    "In 100 metres, turn left onto Via Verdi",
  ]);
  await unmount();
});

test("by bike the kilometres are said every 10, with the average speed", async () => {
  const { unmount } = await follow(line(21_000), { activity: "cycling" });
  await act(async () => {
    go(0, 21_000, RIDING, 50);
  });
  expect(said().filter((words) => /kilometre/.test(words))).toEqual([
    "10 kilometres. Time: 24 minutes. Average speed: 25 kilometres per hour.",
    "20 kilometres. Time: 48 minutes. Average speed: 25 kilometres per hour.",
    // The last 10 against the first 10 (TASK-217): nothing at 10 km.
    "The last 10 kilometres were at the same speed as the 10 before.",
  ]);
  await unmount();
});

test("by bike the last 10 km are compared with the 10 before, with no numbers (TASK-217)", async () => {
  const { unmount } = await follow(line(31_000), { activity: "cycling" });
  // 10 km at 20 km/h, 10 at 26, 11 at 23: a fix every 50 m.
  let seconds = 0;
  await act(async () => {
    for (let m = 0; m <= 31_000; m += 50) {
      onPosition({
        coords: {
          latitude: START[0] + m * METRE,
          longitude: START[1],
          accuracy: 5,
          altitude: null,
        },
        timestamp: BEGAN + Math.round(seconds * 1000),
      } as Location.LocationObject);
      seconds += 50 / ((m < 10_000 ? 20 : m < 20_000 ? 26 : 23) / 3.6);
    }
  });
  expect(said().filter((words) => /kilometre/.test(words))).toEqual([
    expect.stringMatching(/^10 kilometres\. Time: /),
    expect.stringMatching(/^20 kilometres\. Time: /),
    "The last 10 kilometres were faster than the 10 before.",
    expect.stringMatching(/^30 kilometres\. Time: /),
    "The last 10 kilometres were slower than the 10 before.",
  ]);
  await unmount();
});

test("a ride that goes on does not say again the 10 km it has said", async () => {
  const route = line(21_000);
  const first = await follow(route, { activity: "cycling" });
  await act(async () => {
    go(0, 12_000, RIDING, 50);
  });
  await first.unmount();
  jest.mocked(Speech.speak).mockClear();
  // «Start» again on the same route, soon after: the same track goes on.
  const again = await renderHook(() =>
    useNavigation(route, DIRECTIONS, true, 0.9, { activity: "cycling" }),
  );
  await act(async () => {});
  await act(async () => {
    go(12_050, 21_000, RIDING, 50);
  });
  expect(said().filter((words) => /kilometre/.test(words))).toEqual([
    expect.stringMatching(/^20 kilometres\. Time: /),
    // With its comparison (TASK-217), once.
    expect.stringMatching(/^The last 10 kilometres were /),
  ]);
  await again.unmount();
});

test("by bike the way between two letters is ridden", async () => {
  // «SU»: the S to 300 m, a walk to 500 m, the U to 1000 m.
  const { unmount } = await follow(line(1000), {
    activity: "cycling",
    walks: [[3, 5]],
    word: "SU",
  });
  await act(async () => {
    go(0, 1000, RIDING);
  });
  expect(said()).toContain("Letter done. Ride to the U: the drawing is paused.");
  expect(said()).toContain("Pen down: draw the U.");
  expect(said().join(" ")).not.toContain("Walk to");
  await unmount();
});

test.each([[undefined], ["running" as const]])(
  "a run (activity %s) says a run's words, and each kilometre against the one before",
  async (activity) => {
    const { unmount } = await follow(line(2100), { activity, walks: [], word: null! });
    await act(async () => {
      go(0, 2100, RUNNING);
    });
    expect(said()).toEqual([
      "Head out on Via Roma",
      "In 50 metres, turn left onto Via Verdi",
      "1 kilometre. Time: 6 minutes. Average pace: 6 minutes per kilometre.",
      "2 kilometres. Time: 12 minutes. Average pace: 6 minutes per kilometre.",
      // TASK-217.
      "Same pace as the last kilometre.",
      "You have arrived.",
    ]);
    await unmount();
  },
);
