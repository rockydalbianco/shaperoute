/**
 * A ride without a route (TASK-251 part C, ADR-0215): with «Bike» in
 * «Settings» the run screen and its end show speeds in km/h, or mph with
 * miles, where a run shows its pace, as along a bike route (RunBike.test.tsx).
 * A run without a route keeps its pace, and an outing on the water a
 * paddler's numbers (RunPaddle.test.tsx).
 */
import type { LatLon } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { setAutoPause, setVoice } from "../navigation/runControl";
import { addFix, emptyTrack, type TrackFix } from "../navigation/trackRecorder";
import { clearRun, loadRun, startRun } from "../navigation/trackStore";
import { saveSport, type Sport } from "../settings/sport";
import { resultValue } from "../share/postRun";
import { SharePostButton } from "../share/SharePost";
import { saveUnitsChoice } from "../units/units";
import { FreeFinishCard, FreeRunCard } from "./FreeRunScreen";

// The post's button, for the run it is given: the post is SharePost's.
jest.mock("../share/SharePost", () => ({ SharePostButton: jest.fn(() => null) }));
jest.mock("../i18n/language", () => ({
  ...jest.requireActual<typeof import("../i18n/language")>("../i18n/language"),
  appLanguage: jest.fn(() => "en"),
}));
jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  getAvailableVoicesAsync: jest.fn(async () => []),
}));
jest.mock("expo-brightness", () => ({
  getBrightnessAsync: jest.fn(() => Promise.resolve(0.6)),
  setBrightnessAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));
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
/** A metre north in degrees, a little over: 1000 m are a whole km. */
const METRE = 1 / 111_194;
const NOW = Date.UTC(2026, 9, 9, 7, 0, 0);

/** 2.3 km north, the first kilometre at 24 km/h (2:30) and the rest at
 * 20 km/h (3:00), a fix every 50 m, the last one now: RunBike.test.tsx's. */
function slowingDown(): TrackFix[] {
  const secondsAt = (m: number) => (m <= 1000 ? m * 0.15 : 150 + (m - 1000) * 0.18);
  const total = secondsAt(2300);
  const fixes: TrackFix[] = [];
  for (let m = 0; m <= 2300; m += 50) {
    fixes.push({
      point: [START[0] + m * METRE, START[1]],
      timeMs: NOW - (total - secondsAt(m)) * 1000,
      accuracyM: 5,
    });
  }
  return fixes;
}

/** Renders the free run's card with `sport` in «Settings», then «run» again. */
async function withSport(sport: Sport, check: () => Promise<void>): Promise<void> {
  await act(async () => {
    saveSport(sport);
  });
  try {
    await check();
  } finally {
    await act(async () => {
      saveSport("run");
    });
  }
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW, doNotFake: ["queueMicrotask", "nextTick"] });
  clearRun();
  setAutoPause(true);
  setVoice(true);
});

afterEach(() => {
  jest.useRealTimers();
});

test("without a route, «Bike» in «Settings» makes the numbers speeds", async () => {
  const track = slowingDown().reduce(addFix, emptyTrack());
  await withSport("bike", async () => {
    await render(<FreeRunCard running={false} track={track} onStop={() => {}} />);
    // Under the map: the speed now, as along a bike route.
    expect(screen.getByLabelText("Speed now: 20.0 km/h")).toBeOnTheScreen();
    expect(screen.queryByText("Pace now")).toBeNull();
    await fireEvent.press(screen.getByRole("tab", { name: "Data" }));
    expect(screen.getByLabelText("Avg speed: 21.6 km/h")).toBeOnTheScreen();
    expect(screen.getByLabelText("Last km: 20.0 km/h")).toBeOnTheScreen();
    expect(screen.queryByText("Avg pace")).toBeNull();
    // Each kilometre's speed, and how it changed.
    expect(screen.getByLabelText("Kilometre 1: 24.0 km/h")).toBeOnTheScreen();
    expect(screen.getByLabelText("Kilometre 2: 20.0 km/h, -4.0")).toBeOnTheScreen();
  });
});

test("without a route, a ride with miles is in mph", async () => {
  const track = slowingDown().reduce(addFix, emptyTrack());
  await act(async () => {
    saveUnitsChoice("mi");
  });
  try {
    await withSport("bike", async () => {
      await render(<FreeRunCard running={false} track={track} onStop={() => {}} />);
      // 20 km/h are 12.4 mph.
      expect(screen.getByLabelText("Speed now: 12.4 mph")).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole("tab", { name: "Data" }));
      expect(screen.getByLabelText("Avg speed: 13.4 mph")).toBeOnTheScreen();
    });
  } finally {
    await act(async () => {
      saveUnitsChoice("phone");
    });
  }
});

test("without a route, a run keeps its pace and the water a paddler's numbers", async () => {
  const track = slowingDown().reduce(addFix, emptyTrack());
  await withSport("run", async () => {
    const { unmount } = await render(
      <FreeRunCard running={false} track={track} onStop={() => {}} />,
    );
    expect(screen.getByLabelText("Pace now: 3:00 /km")).toBeOnTheScreen();
    await unmount();
  });
  await withSport("paddle", async () => {
    await render(<FreeRunCard running={false} track={track} onStop={() => {}} />);
    expect(screen.getByLabelText("Speed now: 20.0 km/h")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("tab", { name: "Data" }));
    // A paddler's tiles: the pace of 500 m, no Last km.
    expect(screen.getByLabelText("Avg /500 m: 1:23")).toBeOnTheScreen();
    expect(screen.queryByText("Last km")).toBeNull();
  });
});

test("the end of a ride without a route: speeds, and the post's pace a ride's", async () => {
  jest.mocked(SharePostButton).mockClear();
  const recorder = startRun([], NOW, undefined, [], "cycling");
  slowingDown().forEach((fix) => recorder.onFix(fix, false));
  recorder.stop();
  const run = loadRun();
  if (run === null) {
    throw new Error("the ride was not kept");
  }
  await render(<FreeFinishCard run={run} onDone={() => {}} />);
  expect(screen.getByText("2.30 km")).toBeOnTheScreen();
  expect(screen.getByLabelText("Avg speed: 21.6 km/h")).toBeOnTheScreen();
  expect(screen.getByLabelText("Last km: 20.0 km/h")).toBeOnTheScreen();
  expect(screen.queryByText("Avg pace")).toBeNull();
  // The post says what a ride along a route says: the pace of a km.
  const post = jest.mocked(SharePostButton).mock.calls[0][0].makeRun();
  expect(post.activity).toBe("cycling");
  expect(resultValue(post, "pace")).toBe("2:47 /km");
});
