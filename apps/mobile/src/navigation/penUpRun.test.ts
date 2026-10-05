/**
 * A word with the pen up, run (TASK-198): positions simulated along a word
 * of three letters, through the navigation as the run screen uses it. The
 * recording pauses on each walk, the voice says so once, and the run's
 * metres and time are the letters'.
 */
import type { Direction, LatLon, Walk } from "@shaperoute/shared-types";
import { act, renderHook } from "@testing-library/react-native";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { Vibration } from "react-native";

import { PEN_DOWN_M } from "./penUp";
import { pauseRun, resumeRun, runControl, skipCountdown } from "./runControl";
import { durationMs, openPause } from "./trackRecorder";
import { clearRun, endRun, loadRun, type ScorableRun } from "./trackStore";
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
const BEGAN = Date.UTC(2026, 9, 2, 7, 0, 0);

/** «SUN», north in a line: S from 0 to 300 m, a walk to 500 m, U to 800 m,
 * a walk to 1000 m, N to 1300 m. Each letter 300 m, each walk 200 m. */
const ROUTE: LatLon[] = [
  0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300,
].map((m) => [START[0] + m * METRE, START[1]]);
const WALKS: Walk[] = [
  [3, 5],
  [8, 10],
];
const WORD = "SUN";
const NO_DIRECTIONS: Direction[] = [];
const PEN = { walks: WALKS, word: WORD };

/** When the runner, at 3.3 m a second, is `northM` along: in whole ms. */
const msAt = (northM: number) => northM * 300;

let onPosition: (position: Location.LocationObject) => void = () => {};

function position(northM: number) {
  return {
    coords: {
      latitude: START[0] + northM * METRE,
      longitude: START[1],
      accuracy: 5,
      altitude: null,
    },
    timestamp: BEGAN + msAt(northM),
  } as Location.LocationObject;
}

/** Runs from `fromM` to `toM`, a fix every 20 m. */
function runTo(fromM: number, toM: number) {
  for (let m = fromM; m <= toM; m += 20) {
    onPosition(position(m));
  }
}

function said(): string[] {
  return jest.mocked(Speech.speak).mock.calls.map(([text]) => text);
}

function times(text: string): number {
  return said().filter((words) => words === text).length;
}

// A turn and the pen vibrate (useNavigation.play): not in a test.
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

/** Navigation along ROUTE, with the pen of `pen`, past its countdown. */
async function startRunning(pen?: { walks: Walk[]; word: string }) {
  const hook = await renderHook(() =>
    useNavigation(ROUTE, NO_DIRECTIONS, true, 0.9, pen),
  );
  // The permission and the GPS are asked for first.
  await act(async () => {});
  expect(runControl().phase).toBe("countdown");
  await act(async () => {
    skipCountdown();
  });
  return hook;
}

test("a word of three letters pauses twice, from each walk to its next letter", async () => {
  const { result, unmount } = await startRunning(PEN);
  await act(async () => {
    runTo(0, 1300);
  });
  const state = result.current;
  if (state.status !== "following") {
    throw new Error(`not following: ${state.status}`);
  }
  const { track } = state;
  // Two pauses of the pen: from where each walk begins to PEN_DOWN_M before
  // the next letter, where the first fix comes no farther than that.
  const at = (northM: number) => BEGAN + msAt(northM);
  expect(track.pauses).toEqual([
    { fromMs: at(300), toMs: at(500 - PEN_DOWN_M), pen: true },
    { fromMs: at(800), toMs: at(1000 - PEN_DOWN_M), pen: true },
  ]);
  // Each letter starts a line of its own: no metre from the walk before.
  expect(track.fixes.filter((fix) => fix.gap).map((fix) => fix.point[0])).toEqual([
    position(500 - PEN_DOWN_M).coords.latitude,
    position(1000 - PEN_DOWN_M).coords.latitude,
  ]);

  // Each cue once, in order, the next letter by its name.
  expect(times("Letter done. Walk to the U: the drawing is paused.")).toBe(1);
  expect(times("Pen down: draw the U.")).toBe(1);
  expect(times("Letter done. Walk to the N: the drawing is paused.")).toBe(1);
  expect(times("Pen down: draw the N.")).toBe(1);
  const pen = said().filter((words) => /Letter done|Pen down/.test(words));
  expect(pen).toEqual([
    "Letter done. Walk to the U: the drawing is paused.",
    "Pen down: draw the U.",
    "Letter done. Walk to the N: the drawing is paused.",
    "Pen down: draw the N.",
  ]);
  expect(runControl()).toMatchObject({ phase: "running", pen: false });
  await unmount();
});

test("the run's metres and time leave the walks out", async () => {
  const { result, unmount } = await startRunning(PEN);
  await act(async () => {
    runTo(0, 1300);
  });
  const state = result.current;
  if (state.status !== "following") {
    throw new Error(`not following: ${state.status}`);
  }
  // Arrived 25 m from the end: the letters, 300 + 300 + 280 m, and the
  // PEN_DOWN_M before each of the two letters that follow a walk; none of
  // the 2 × 200 m walked.
  expect(state.navigation.arrived).toBe(true);
  expect(state.track.distanceM).toBeCloseTo(300 + 300 + 280 + 2 * PEN_DOWN_M, 0);
  // From the first fix to the last, less the two walks.
  const walked = 2 * (msAt(500 - PEN_DOWN_M) - msAt(300));
  expect(durationMs(state.track)).toBe(msAt(1280) - walked);
  await unmount();
});

test("a pause asked by hand on a walk is not ended by the next letter", async () => {
  const { result, unmount } = await startRunning(PEN);
  await act(async () => {
    runTo(0, 360);
  });
  expect(runControl()).toMatchObject({ phase: "paused", pen: true });
  // On the walk, the runner goes on by hand, then pauses by hand.
  await act(async () => {
    jest.setSystemTime(BEGAN + msAt(360));
    resumeRun();
    runTo(380, 400);
    jest.setSystemTime(BEGAN + msAt(400));
    pauseRun();
  });
  expect(runControl()).toMatchObject({ phase: "paused", pen: false });
  await act(async () => {
    runTo(420, 600);
  });
  // The next letter is said, but the pause stays the runner's.
  expect(times("Pen down: draw the U.")).toBe(1);
  expect(runControl()).toMatchObject({ phase: "paused", pen: false });
  const state = result.current;
  if (state.status !== "following") {
    throw new Error(`not following: ${state.status}`);
  }
  expect(openPause(state.track)).toEqual({ fromMs: BEGAN + msAt(400), toMs: null });
  // Nothing after the runner's pause is of the run.
  expect(state.track.fixes.at(-1)?.timeMs).toBe(BEGAN + msAt(400));
  await unmount();
});

test("the run keeps the walks and its route, for «Save» to send", async () => {
  const { unmount } = await startRunning(PEN);
  await act(async () => {
    runTo(0, 1300);
  });
  await unmount();
  const saved = loadRun();
  expect(saved?.walks).toEqual(WALKS);
  expect(saved?.track.pauses?.every((pause) => pause.pen === true)).toBe(true);
  // The ended run has them still: the API scores the letters alone.
  const run = endRun() as ScorableRun;
  expect(run.walks).toEqual(WALKS);
  expect(run.route).toEqual(ROUTE);
});

test("a route without walks runs as before: no pause, nothing said of a pen", async () => {
  const { result, unmount } = await startRunning();
  await act(async () => {
    runTo(0, 1300);
  });
  const state = result.current;
  if (state.status !== "following") {
    throw new Error(`not following: ${state.status}`);
  }
  expect(state.track.pauses).toBeUndefined();
  expect(state.track.distanceM).toBeCloseTo(1280, 0);
  expect(said().filter((words) => /Letter done|Pen down/.test(words))).toEqual([]);
  await unmount();
  expect(loadRun()?.walks).toBeUndefined();
  expect(endRun()?.walks).toBeUndefined();
});
