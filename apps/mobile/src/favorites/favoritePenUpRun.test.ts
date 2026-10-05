/**
 * A favorite of a word with the pen up, opened and run (TASK-199):
 * positions simulated along «SUN», through the navigation as the run
 * screen uses it with the route of an opened favorite. The recording
 * pauses at the end of each letter, as for a word just drawn (TASK-198),
 * and the run saved in «My activities» sends the walks and the pen.
 */
import type { Direction, LatLon } from "@shaperoute/shared-types";
import { act, renderHook } from "@testing-library/react-native";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { Vibration } from "react-native";

import { recordedRun } from "../activities/recordedRun";
import type { FavoriteDetail } from "../api/favorites";
import { PEN_DOWN_M } from "../navigation/penUp";
import { runControl, skipCountdown } from "../navigation/runControl";
import { clearRun, endRun, loadRun, type ScorableRun } from "../navigation/trackStore";
import { useNavigation } from "../navigation/useNavigation";
import { openedFavorite } from "./favoriteRoute";

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
const NO_DIRECTIONS: Direction[] = [];

/** «SUN», north in a line: S from 0 to 300 m, a walk to 500 m, U to 800 m,
 * a walk to 1000 m, N to 1300 m. */
const POINTS: LatLon[] = [
  0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300,
].map((m) => [START[0] + m * METRE, START[1]]);

/** The favorite as GET /me/favorites/{key} sends it. */
const FAVORITE: FavoriteDetail = {
  id: "5a0b1c2d3e4f5061",
  city: "",
  shape: null,
  word: "SUN",
  style: "round",
  title: null,
  distance_m: 1000,
  route_m: 1300,
  similarity: 0.9,
  points: POINTS,
  created_at: "2026-10-02T06:00:00Z",
  walks: [
    [3, 5],
    [8, 10],
  ],
};

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

/** Start on the favorite: its route, as the run screen follows it. */
async function startOn(favorite: FavoriteDetail) {
  const { result: route } = openedFavorite(favorite);
  const hook = await renderHook(() =>
    useNavigation(route.points, NO_DIRECTIONS, true, route.similarity, {
      walks: route.walks,
      word: route.word,
    }),
  );
  await act(async () => {});
  await act(async () => {
    skipCountdown();
  });
  return hook;
}

test("a favorite with the pen up pauses by itself at the end of each letter", async () => {
  const { result, unmount } = await startOn(FAVORITE);
  await act(async () => {
    runTo(0, 360);
  });
  // On the walk after the S: paused by the pen, said once.
  expect(runControl()).toMatchObject({ phase: "paused", pen: true });
  expect(said()).toContain("Letter done. Walk to the U: the drawing is paused.");
  await act(async () => {
    runTo(380, 1300);
  });
  const state = result.current;
  if (state.status !== "following") {
    throw new Error(`not following: ${state.status}`);
  }
  const at = (northM: number) => BEGAN + msAt(northM);
  expect(state.track.pauses).toEqual([
    { fromMs: at(300), toMs: at(500 - PEN_DOWN_M), pen: true },
    { fromMs: at(800), toMs: at(1000 - PEN_DOWN_M), pen: true },
  ]);
  expect(said().filter((words) => /Letter done|Pen down/.test(words))).toEqual([
    "Letter done. Walk to the U: the drawing is paused.",
    "Pen down: draw the U.",
    "Letter done. Walk to the N: the drawing is paused.",
    "Pen down: draw the N.",
  ]);
  await unmount();

  // The run keeps the walks, and «Save» sends them with the pen.
  expect(loadRun()?.walks).toEqual(FAVORITE.walks);
  const run = endRun() as ScorableRun;
  expect(run.walks).toEqual(FAVORITE.walks);
  const saved = recordedRun(run, {
    shape: null,
    word: "SUN",
    style: "round",
    title: null,
  });
  expect(saved?.request.walks).toEqual(FAVORITE.walks);
  expect(saved?.request.pauses).toEqual([
    { from_ms: at(300), to_ms: at(500 - PEN_DOWN_M), auto: false, pen: true },
    { from_ms: at(800), to_ms: at(1000 - PEN_DOWN_M), auto: false, pen: true },
  ]);
});

test("a favorite kept before TASK-199 runs as one line, as before", async () => {
  const { walks: _walks, ...older } = FAVORITE;
  const { result, unmount } = await startOn(older);
  await act(async () => {
    runTo(0, 1300);
  });
  const state = result.current;
  if (state.status !== "following") {
    throw new Error(`not following: ${state.status}`);
  }
  expect(state.track.pauses).toBeUndefined();
  expect(said().filter((words) => /Letter done|Pen down/.test(words))).toEqual([]);
  await unmount();
  const run = endRun() as ScorableRun;
  expect(run.walks).toBeUndefined();
  expect(recordedRun(run, null)?.request).not.toHaveProperty("walks");
});
