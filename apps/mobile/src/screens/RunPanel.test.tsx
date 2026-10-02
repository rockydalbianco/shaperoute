import type { LatLon } from "@shaperoute/shared-types";
import { act, render, screen } from "@testing-library/react-native";

import { addFix, emptyTrack, type Track } from "../navigation/trackRecorder";
import { RunPanel, TICK_MS } from "./RunPanel";

const START: LatLon = [46.0122, 11.2986];
const METRE = 1 / 111_195;
const NOW = Date.UTC(2026, 9, 2, 7, 0, 0);

/** Straight north, a fix every 50 m at `secondsPerKm`, the last at `endMs`. */
function north(metres: number, secondsPerKm: number, endMs: number): Track {
  let track = emptyTrack();
  for (let m = 0; m <= metres; m += 50) {
    track = addFix(track, {
      point: [START[0] + m * METRE, START[1]],
      timeMs: endMs - ((metres - m) / 1000) * secondsPerKm * 1000,
      accuracyM: 5,
    });
  }
  return track;
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
});

afterEach(() => {
  jest.useRealTimers();
});

test("without a route: distance, both paces, the clock and the last kilometre", async () => {
  // 1.5 km at 6:00 /km: nine minutes.
  await render(<RunPanel track={north(1500, 360, NOW)} ticking />);
  expect(screen.getByText("1.50 km")).toBeOnTheScreen();
  expect(screen.getByLabelText("Avg pace: 6:00 /km")).toBeOnTheScreen();
  expect(screen.getByLabelText("Pace now: 6:00 /km")).toBeOnTheScreen();
  expect(screen.getByLabelText("Time: 9:00")).toBeOnTheScreen();
  expect(screen.getByText("Last km")).toBeOnTheScreen();
  expect(screen.getByText("6:00 /km")).toBeOnTheScreen();
  // No route: nothing to go, no bar.
  expect(screen.queryByText(/to go/)).toBeNull();
  expect(screen.queryByTestId("route-done")).toBeNull();
  // The clock goes on between fixes.
  await act(async () => {
    jest.advanceTimersByTime(TICK_MS);
  });
  expect(screen.getByLabelText("Time: 9:01")).toBeOnTheScreen();
});

test("along a route: what is left, about how long, and the bar", async () => {
  await render(
    <RunPanel
      track={north(1500, 360, NOW)}
      ticking
      route={{ remainingM: 3200, done: 0.42 }}
    />,
  );
  expect(screen.getByText("3.2 km to go")).toBeOnTheScreen();
  // 3.2 km at 6:00 /km.
  expect(screen.getByText("about 19 min")).toBeOnTheScreen();
  expect(screen.getByTestId("route-done")).toHaveStyle({ width: "42%" });
  // What is left takes the place of the last kilometre.
  expect(screen.queryByText("Last km")).toBeNull();
});

test("before 100 metres there is no pace, and no time left to say", async () => {
  await render(
    <RunPanel
      track={north(50, 360, NOW)}
      ticking
      route={{ remainingM: 4950, done: 0.01 }}
    />,
  );
  expect(screen.getByText("0.05 km")).toBeOnTheScreen();
  expect(screen.getByLabelText("Avg pace: – /km")).toBeOnTheScreen();
  expect(screen.getByLabelText("Pace now: – /km")).toBeOnTheScreen();
  expect(screen.getByLabelText("Time: 0:18")).toBeOnTheScreen();
  expect(screen.getByText("5.0 km to go")).toBeOnTheScreen();
  expect(screen.queryByText(/^about/)).toBeNull();
});

test("before the first fix everything waits at zero", async () => {
  await render(<RunPanel track={emptyTrack()} ticking={false} />);
  expect(screen.getByText("0.00 km")).toBeOnTheScreen();
  expect(screen.getByLabelText("Time: 0:00")).toBeOnTheScreen();
  expect(screen.queryByText("Last km")).toBeNull();
});

test("a run that is over stops its clock at the last fix", async () => {
  // Ended a minute ago.
  await render(<RunPanel track={north(1000, 300, NOW - 60_000)} ticking={false} />);
  expect(screen.getByLabelText("Time: 5:00")).toBeOnTheScreen();
  await act(async () => {
    jest.advanceTimersByTime(5 * TICK_MS);
  });
  expect(screen.getByLabelText("Time: 5:00")).toBeOnTheScreen();
  expect(screen.getByLabelText("Avg pace: 5:00 /km")).toBeOnTheScreen();
});
