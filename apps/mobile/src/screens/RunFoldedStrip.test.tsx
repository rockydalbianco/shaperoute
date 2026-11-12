import type { LatLon } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useEffect, useState } from "react";
import { Text } from "react-native";

import {
  controlRun,
  runControl,
  type RunSession,
  setAutoPause,
  skipCountdown,
} from "../navigation/runControl";
import { setRunPage } from "../navigation/runPage";
import { emptyTrack, type Track, type TrackFix } from "../navigation/trackRecorder";
import { clearRun, startRun } from "../navigation/trackStore";
import { RunCard } from "./RunDashboard";
import { FOLD_M, foldedAfter, upOrDown } from "./RunFoldedStrip";

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
const METRE = 1 / 111_195;
const NOW = Date.UTC(2026, 10, 12, 7, 0, 0);

/** Straight north at 5:00 /km, a fix every 50 m, the last one now. */
function north(metres: number): TrackFix[] {
  const fixes: TrackFix[] = [];
  for (let m = 0; m <= metres; m += 50) {
    fixes.push({
      point: [START[0] + m * METRE, START[1]],
      timeMs: NOW - ((metres - m) / 1000) * 300 * 1000,
      accuracyM: 5,
    });
  }
  return fixes;
}

/** A run as the recording hooks make it, its fixes after the countdown. */
function LiveRun({ fixes }: { fixes: TrackFix[] }) {
  const [track, setTrack] = useState<Track>(emptyTrack);
  useEffect(() => {
    const recorder = startRun([], Date.now());
    const session: RunSession = controlRun(recorder, {
      onChange: () => setTrack(recorder.track()),
      say: () => {},
    });
    const gps = (next: TrackFix) => {
      session.onFix(next, false);
      setTrack(recorder.track());
    };
    skipCountdown();
    fixes.forEach(gps);
    return () => session.end();
    // Once: the run of the test.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <RunCard track={track} live heading={<Text>Next turn</Text>} onStop={() => {}} />
  );
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW, doNotFake: ["queueMicrotask", "nextTick"] });
  clearRun();
  setAutoPause(true);
});

afterEach(() => {
  jest.useRealTimers();
  setRunPage("map");
});

test("a drag down folds the card, a drag up opens it, a short one leaves it", () => {
  expect(foldedAfter(0, FOLD_M, false)).toBe(true);
  expect(foldedAfter(0, -FOLD_M, true)).toBe(false);
  expect(foldedAfter(0, FOLD_M - 1, false)).toBe(false);
  expect(foldedAfter(0, -(FOLD_M - 1), true)).toBe(true);
  // More sideways than down: a swipe between pages, not a fold.
  expect(foldedAfter(FOLD_M, FOLD_M, false)).toBe(false);
});

test("the card takes a drag up or down, not one sideways", () => {
  expect(upOrDown(0, 20)).toBe(true);
  expect(upOrDown(2, -20)).toBe(true);
  expect(upOrDown(0, 10)).toBe(false);
  expect(upOrDown(20, 20)).toBe(false);
});

test("running on «Map»: folded, a strip with the three numbers and Pause", async () => {
  await render(<LiveRun fixes={north(300)} />);
  expect(screen.queryByTestId("run-folded")).toBeNull();
  await fireEvent.press(screen.getByLabelText("Hide the numbers"));

  expect(screen.getByTestId("run-folded")).toBeOnTheScreen();
  expect(screen.getByLabelText("Distance: 0.30 km")).toBeOnTheScreen();
  expect(screen.getByLabelText("Pace now: 5:00 /km")).toBeOnTheScreen();
  expect(screen.getByLabelText("Time: 1:30")).toBeOnTheScreen();
  // The rest of the card is gone: the map takes the room.
  expect(screen.queryByLabelText("Pocket mode")).toBeNull();
  expect(screen.queryByRole("tab", { name: "Map" })).toBeNull();

  // Touched, the strip opens the card again.
  await fireEvent.press(screen.getByTestId("run-fold-handle"));
  expect(screen.queryByTestId("run-folded")).toBeNull();
  expect(screen.getByRole("tab", { name: "Map" })).toBeSelected();
});

test("Pause on the strip pauses, and the card opens with Stop and Resume", async () => {
  await render(<LiveRun fixes={north(300)} />);
  await fireEvent.press(screen.getByLabelText("Hide the numbers"));
  await fireEvent.press(screen.getByTestId("run-folded-pause"));

  expect(runControl().phase).toBe("paused");
  expect(screen.queryByTestId("run-folded")).toBeNull();
  expect(screen.getByLabelText("Resume")).toBeOnTheScreen();
  // No handle on a paused run: it does not fold.
  expect(screen.queryByLabelText("Hide the numbers")).toBeNull();

  // Going on, the card is folded again, as the runner left it.
  await fireEvent.press(screen.getByLabelText("Resume"));
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  expect(screen.getByTestId("run-folded")).toBeOnTheScreen();
});

test("only «Map» folds: «Compass» and «Data» have no handle", async () => {
  await render(<LiveRun fixes={north(300)} />);
  await fireEvent.press(screen.getByRole("tab", { name: "Compass" }));
  expect(screen.queryByLabelText("Hide the numbers")).toBeNull();
  await fireEvent.press(screen.getByRole("tab", { name: "Data" }));
  expect(screen.queryByLabelText("Hide the numbers")).toBeNull();
});

test("before the first fix nothing folds", async () => {
  await render(<LiveRun fixes={[]} />);
  expect(screen.queryByLabelText("Hide the numbers")).toBeNull();
});
