import type { LatLon } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import type { FreeRun } from "../navigation/freeRun";
import type { Track } from "../navigation/trackRecorder";
import { FreeFinishCard, FreeRunBanner, FreeRunCard, TICK_MS } from "./FreeRunScreen";

jest.mock("expo-brightness", () => ({
  getBrightnessAsync: jest.fn(() => Promise.resolve(0.6)),
  setBrightnessAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));

const START: LatLon = [46.0122, 11.2986];
const NOW = Date.UTC(2026, 9, 2, 7, 0, 0);

/** A track of `metres`, from `startMs` to `endMs`. */
function track(metres: number, startMs: number, endMs: number): Track {
  return {
    fixes: [
      { point: START, timeMs: startMs, accuracyM: 5 },
      { point: [START[0] + 0.01, START[1]], timeMs: endMs, accuracyM: 5 },
    ],
    distanceM: metres,
  };
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
});

afterEach(() => {
  jest.useRealTimers();
});

test("while running, the banner has the distance, the clock and the pace", async () => {
  // 1.5 km, started 9 minutes ago: 6 min per km.
  await render(
    <FreeRunBanner
      state={{
        status: "running",
        track: track(1500, NOW - 540_000, NOW - 1000),
        position: START,
      }}
    />,
  );
  expect(screen.getByText("1.50 km")).toBeOnTheScreen();
  expect(screen.getByText("9:00 · 6:00 /km")).toBeOnTheScreen();
  // The clock goes on between fixes.
  await act(async () => {
    jest.advanceTimersByTime(TICK_MS);
  });
  expect(screen.getByText("9:01 · 6:01 /km")).toBeOnTheScreen();
});

test("before the first fix, the banner waits for the GPS", async () => {
  await render(
    <FreeRunBanner
      state={{ status: "running", track: { fixes: [], distanceM: 0 }, position: null }}
    />,
  );
  expect(screen.getByText("Finding your position…")).toBeOnTheScreen();
});

test("without the location, the banner says how to turn it on", async () => {
  await render(<FreeRunBanner state={{ status: "denied" }} />);
  expect(
    screen.getByText(
      "Location is off for Sgrava: allow it in Settings to record a run.",
    ),
  ).toBeOnTheScreen();
});

test("Stop ends the run; Pocket only once the GPS is on", async () => {
  const onStop = jest.fn();
  const { rerender } = await render(<FreeRunCard running={false} onStop={onStop} />);
  expect(screen.queryByText("Pocket")).toBeNull();
  await rerender(<FreeRunCard running onStop={onStop} />);
  expect(screen.getByText("Pocket")).toBeOnTheScreen();
  await fireEvent.press(screen.getByText("Stop"));
  expect(onStop).toHaveBeenCalledTimes(1);
});

test("the end of a free run has its numbers, Keep running and Done", async () => {
  const run: FreeRun = {
    version: 1,
    route: [],
    track: track(4210, 0, 1_500_000),
    status: "stopped",
  };
  const onResume = jest.fn();
  const onDone = jest.fn();
  await render(<FreeFinishCard run={run} onResume={onResume} onDone={onDone} />);
  expect(screen.getByText("4.21 km")).toBeOnTheScreen();
  expect(screen.getByText("25:00 · 5:56 /km")).toBeOnTheScreen();
  await fireEvent.press(screen.getByText("Keep running"));
  expect(onResume).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByText("Done"));
  expect(onDone).toHaveBeenCalledTimes(1);
});

test("a run that can no longer go on has Done only", async () => {
  const run: FreeRun = {
    version: 1,
    route: [],
    track: track(50, 0, 30_000),
    status: "running",
  };
  await render(<FreeFinishCard run={run} onDone={jest.fn()} />);
  expect(screen.getByText("0.05 km")).toBeOnTheScreen();
  // Too short for a pace.
  expect(screen.getByText("0:30")).toBeOnTheScreen();
  expect(screen.queryByText("Keep running")).toBeNull();
});
