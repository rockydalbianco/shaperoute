/**
 * The run screen along a bike route (TASK-216): the speed in km/h wherever a
 * run shows its pace, under the map, on «Data» and in the kilometres one by
 * one. A run's screen is in RunPanel.test.tsx and RunDashboard.test.tsx, as
 * before.
 */
import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { useEffect, useState } from "react";
import { Text } from "react-native";

import { appLanguage } from "../i18n/language";
import {
  controlRun,
  type RunSession,
  setAutoPause,
  setVoice,
  skipCountdown,
} from "../navigation/runControl";
import {
  addFix,
  emptyTrack,
  type Track,
  type TrackFix,
} from "../navigation/trackRecorder";
import { clearRun, startRun } from "../navigation/trackStore";
import { RunCard } from "./RunDashboard";
import { RunGrid, RunStrip, useRunNumbers } from "./RunPanel";

// The app's language, English unless a test says otherwise.
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
const NOW = Date.UTC(2026, 9, 3, 7, 0, 0);

/** 2.3 km north, the first kilometre at 24 km/h (2:30) and the rest at
 * 20 km/h (3:00), a fix every 50 m, the last one now. */
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

/** The GPS of the ride on screen: a fix, when the test gives one. */
let gps: (fix: TrackFix) => void = () => {};

/** A ride as the recording hooks make it, along a bike route. */
function LiveRide({ fixes }: { fixes: TrackFix[] }) {
  const [track, setTrack] = useState<Track>(emptyTrack);
  useEffect(() => {
    const recorder = startRun([], Date.now());
    const session: RunSession = controlRun(recorder, {
      onChange: () => setTrack(recorder.track()),
      say: () => {},
    });
    gps = (next) => {
      session.onFix(next, false);
      setTrack(recorder.track());
    };
    skipCountdown();
    fixes.forEach(gps);
    return () => session.end();
  }, [fixes]);
  return (
    <RunCard
      track={track}
      live
      heading={<Text>Next turn</Text>}
      onStop={() => {}}
      activity="cycling"
    />
  );
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

test("by bike the numbers are speeds in km/h, a run's are paces as before", async () => {
  const track = slowingDown().reduce(addFix, emptyTrack());
  function Both() {
    const ride = useRunNumbers(track, false, undefined, "cycling");
    const run = useRunNumbers(track, false, undefined, "running");
    return (
      <>
        <RunStrip numbers={ride} />
        <RunGrid numbers={ride} />
        <RunStrip numbers={run} />
      </>
    );
  }
  await render(<Both />);
  // The last 200 m at 20 km/h, all of it in 6 min 24 s.
  expect(screen.getAllByLabelText("Speed now: 20.0 km/h")).toHaveLength(2);
  expect(screen.getByLabelText("Avg speed: 21.6 km/h")).toBeOnTheScreen();
  expect(screen.getByLabelText("Last km: 20.0 km/h")).toBeOnTheScreen();
  expect(screen.getAllByLabelText("Distance: 2.30 km")).toHaveLength(2);
  // A run along the same line: its pace, as before.
  expect(screen.getByLabelText("Pace now: 3:00 /km")).toBeOnTheScreen();
  expect(screen.queryByText("Avg pace")).toBeNull();
});

test("by bike «Data» says each kilometre's speed, and how it changed", async () => {
  await render(<LiveRide fixes={slowingDown()} />);
  // Under the map: the speed now.
  expect(screen.getByLabelText("Speed now: 20.0 km/h")).toBeOnTheScreen();
  expect(screen.queryByText("Pace now")).toBeNull();
  await fireEvent.press(screen.getByRole("tab", { name: "Data" }));
  expect(screen.getByLabelText("Avg speed: 21.6 km/h")).toBeOnTheScreen();
  expect(screen.getByLabelText("Last km: 20.0 km/h")).toBeOnTheScreen();
  expect(screen.getByText("Speed")).toBeOnTheScreen();
  expect(screen.queryByText("Pace")).toBeNull();
  expect(screen.getByLabelText("Kilometre 1: 24.0 km/h")).toBeOnTheScreen();
  expect(screen.getByLabelText("Kilometre 2: 20.0 km/h, -4.0")).toBeOnTheScreen();
  expect(screen.getByText("-4.0")).toBeOnTheScreen();
  // The faster kilometre has the longer bar, as on a run.
  expect(screen.getByTestId("split-bar-1")).toHaveStyle({ width: "100%" });
});

test("in Italian, the names the user chose", async () => {
  jest.mocked(appLanguage).mockReturnValue("it");
  try {
    await render(<LiveRide fixes={slowingDown()} />);
    expect(screen.getByLabelText("Vel. ora: 20.0 km/h")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("tab", { name: "Data" }));
    expect(screen.getByLabelText("Vel. media: 21.6 km/h")).toBeOnTheScreen();
    expect(screen.getByLabelText("Ultimo km: 20.0 km/h")).toBeOnTheScreen();
    expect(screen.getByText("Velocità")).toBeOnTheScreen();
    expect(screen.getByLabelText("Chilometro 2: 20.0 km/h, -4.0")).toBeOnTheScreen();
  } finally {
    jest.mocked(appLanguage).mockReturnValue("en");
  }
});
