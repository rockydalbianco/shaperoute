/**
 * A route followed on the water (TASK-251): positions simulated along it,
 * through the navigation as the run screen uses it. Each kilometre is said
 * with the average pace of 500 m, with miles each mile; a run along the same
 * route says what a run says. Without a route, the same with «Paddle» in
 * «Settings».
 */
import type { Activity, Direction, LatLon, Walk } from "@shaperoute/shared-types";
import { act, renderHook } from "@testing-library/react-native";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { Vibration } from "react-native";

import { runControl, skipCountdown } from "./runControl";
import { saveSport } from "../settings/sport";
import { saveUnitsChoice } from "../units/units";
import { clearRun, loadRun } from "./trackStore";
import { useFreeRun } from "./useFreeRun";
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
 * a fix at 1,000 m has paddled 1 km. */
const METRE = 1 / 111_194;
/** When each test begins, on the clock the tests move by hand. */
const BEGAN = Date.UTC(2026, 9, 6, 7, 0, 0);

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

/** 5 km/h, in metres a second: 6:00 each 500 m. */
const PADDLING = 5 / 3.6;

test("on the water each kilometre is said with the pace of 500 m", async () => {
  const { unmount } = await follow(line(2100), { activity: "paddling" });
  await act(async () => {
    go(0, 2100, PADDLING);
  });
  expect(said().filter((words) => /kilometre/.test(words))).toEqual([
    "1 kilometre. Time: 12 minutes. Average pace: 6 minutes per 500 metres.",
    "2 kilometres. Time: 24 minutes. Average pace: 6 minutes per 500 metres.",
    // Against the kilometre before, as on a run (TASK-217).
    "Same pace as the last kilometre.",
  ]);
  // The file of the run knows it was on the water: the post at its end.
  expect(loadRun()?.activity).toBe("paddling");
  await unmount();
});

test("a run along the same route says a kilometre's pace, as before", async () => {
  const { unmount } = await follow(line(1100), {});
  await act(async () => {
    go(0, 1100, PADDLING);
  });
  expect(said().filter((words) => /kilometre/.test(words))).toEqual([
    "1 kilometre. Time: 12 minutes. Average pace: 12 minutes per kilometre.",
  ]);
  expect(loadRun()).not.toHaveProperty("activity");
  await unmount();
});

test("with miles each mile is said, the pace of 500 m all the same", async () => {
  await act(async () => {
    saveUnitsChoice("mi");
  });
  try {
    const { unmount } = await follow(line(1700), { activity: "paddling" });
    await act(async () => {
      go(0, 1700, PADDLING);
    });
    expect(said().filter((words) => /\bmile\b/.test(words))).toEqual([
      expect.stringMatching(
        /^1 mile\. Time: 19 minutes \d+ seconds\. Average pace: 6 minutes per 500 metres\.$/,
      ),
    ]);
    await unmount();
  } finally {
    await act(async () => {
      saveUnitsChoice("phone");
    });
  }
});

/** An outing without a route, past its countdown. */
async function free() {
  const hook = await renderHook(() => useFreeRun(true));
  await act(async () => {});
  await act(async () => {
    skipCountdown();
  });
  return hook;
}

test("without a route, with «Paddle» the kilometre is said with the pace of 500 m", async () => {
  saveSport("paddle");
  try {
    const { unmount } = await free();
    await act(async () => {
      go(0, 1100, PADDLING);
    });
    expect(said().filter((words) => /kilometre/.test(words))).toEqual([
      "1 kilometre. Time: 12 minutes. Average pace: 6 minutes per 500 metres.",
    ]);
    expect(loadRun()?.activity).toBe("paddling");
    await unmount();
  } finally {
    saveSport("run");
  }
});

test("without a route, a run and a ride say a kilometre's pace, as before", async () => {
  // A ride's file keeps its sport since TASK-251 part C: its numbers are speeds.
  const kept = { run: undefined, bike: "cycling" } as const;
  for (const sport of ["run", "bike"] as const) {
    saveSport(sport);
    clearRun();
    jest.mocked(Speech.speak).mockClear();
    try {
      const { unmount } = await free();
      await act(async () => {
        go(0, 1100, PADDLING);
      });
      expect(said().filter((words) => /kilometre/.test(words))).toEqual([
        "1 kilometre. Time: 12 minutes. Average pace: 12 minutes per kilometre.",
      ]);
      expect(loadRun()?.activity).toBe(kept[sport]);
      await unmount();
    } finally {
      saveSport("run");
    }
  }
});
