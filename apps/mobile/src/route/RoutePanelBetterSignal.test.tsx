import type { RouteRequest, RouteResult } from "@shaperoute/shared-types";
import better from "@shaperoute/shared-types/fixtures/signal-better-distance.json";
import type { Signal } from "@shaperoute/shared-types/src/signals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { sendSignal } from "../api/signals";
import { RouteOutcome } from "./RoutePanel";

// The «Try N km» of the line under a route done (TASK-234 C, ADR-0197):
// told as a hint taken, as the API's tests read it
// (test_signals_better_distance.py).

const horse: RouteRequest = {
  start: [46.0671, 11.1214],
  shape: "horse",
  distance_m: 10000,
  activity: "running",
};

const result: RouteResult = {
  points: [
    [46.0671, 11.1214],
    [46.0671, 11.1214],
  ],
  distance_m: 10200,
  similarity: 0.9,
  shape: "horse",
  warnings: [],
  directions: [],
  better_distance_m: 8000,
};

function done(onSignal: (signal: Signal) => void, onTryDistance = jest.fn()) {
  return (
    <RouteOutcome
      view={{ status: "done", request: horse, result }}
      onCancel={jest.fn()}
      exporting={{ status: "idle" }}
      onExport={jest.fn()}
      onTryDistance={onTryDistance}
      onPickShape={jest.fn()}
      onStart={jest.fn()}
      onSignal={onSignal}
    />
  );
}

test("the Try under the route is told as the contract's better_distance", async () => {
  const onSignal = jest.fn();
  const onTryDistance = jest.fn();
  await render(done(onSignal, onTryDistance));
  await fireEvent.press(screen.getByText("Try 8 km"));
  expect(onSignal.mock.calls).toEqual([[better]]);
  expect(onTryDistance).toHaveBeenCalledWith(8000);
});

test("an API before the hint refuses it, and the route is drawn all the same", async () => {
  const fetchFn = jest.fn().mockResolvedValue(new Response(null, { status: 422 }));
  const sent: Promise<boolean>[] = [];
  const onTryDistance = jest.fn();
  await render(
    done(
      (signal) => sent.push(sendSignal(signal, { baseUrl: "http://api", fetchFn })),
      onTryDistance,
    ),
  );
  await fireEvent.press(screen.getByText("Try 8 km"));
  expect(await Promise.all(sent)).toEqual([false]);
  expect(JSON.parse(fetchFn.mock.calls[0][1].body)).toEqual(better);
  expect(onTryDistance).toHaveBeenCalledWith(8000);
});

test("while the new distance is drawn, the wait replaces the line", async () => {
  // The busy sign the Try already has (TASK-234 C): the panel of the wait,
  // with its bar and «Cancel», takes the place of the route and its line.
  const { rerender } = await render(done(jest.fn()));
  expect(screen.getByText("Try 8 km")).toBeOnTheScreen();
  await rerender(
    <RouteOutcome
      view={{
        status: "waiting",
        request: { ...horse, distance_m: 8000 },
        startedAt: Date.now(),
        phase: "sending",
      }}
      onCancel={jest.fn()}
      exporting={{ status: "idle" }}
      onExport={jest.fn()}
      onTryDistance={jest.fn()}
      onPickShape={jest.fn()}
      onStart={jest.fn()}
    />,
  );
  expect(screen.queryByText("Try 8 km")).not.toBeOnTheScreen();
  expect(screen.getByText("Cancel")).toBeOnTheScreen();
});
