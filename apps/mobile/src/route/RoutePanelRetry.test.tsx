import type { RouteRequest } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { RouteOutcome } from "./RoutePanel";
import type { RouteProblem } from "./useRouteRequest";

// «Try again» under an error of «Draw route» (TASK-256): the same request
// again, where the problem may well not happen twice.

const request: RouteRequest = {
  start: [46.0671, 11.1214],
  shape: "heart",
  distance_m: 5000,
  activity: "running",
};

function failed(problem: RouteProblem, onRetry?: () => void) {
  return (
    <RouteOutcome
      view={{ status: "failed", request, problem }}
      onCancel={jest.fn()}
      exporting={{ status: "idle" }}
      onExport={jest.fn()}
      onTryDistance={jest.fn()}
      onPickShape={jest.fn()}
      onStart={jest.fn()}
      onSignal={jest.fn()}
      onRetry={onRetry}
    />
  );
}

test("without a connection, the words for the runner and «Try again»", async () => {
  const onRetry = jest.fn();
  await render(
    failed({ kind: "unreachable", url: "http://192.168.1.23:8000" }, onRetry),
  );
  expect(
    screen.getByText("No connection. Check the network and try again."),
  ).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

test.each<RouteProblem>([
  { kind: "bad_answer", status: 502 },
  { kind: "api_error", code: "engine_error", message: "engine words" },
  { kind: "timeout" },
  { kind: "lost" },
])("%j offers «Try again»", async (problem) => {
  await render(failed(problem, jest.fn()));
  expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
});

test("a shape that does not fit offers the shapes, not «Try again»", async () => {
  await render(
    failed(
      {
        kind: "api_error",
        code: "shape_not_drawable",
        message: "a 5 km heart cannot be drawn here",
        suggested_distance_m: null,
      },
      jest.fn(),
    ),
  );
  expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  expect(screen.getByRole("button", { name: "heart" })).toBeTruthy();
});

test("a key refused is an app to update: nothing to try again", async () => {
  await render(
    failed(
      { kind: "api_error", code: "unauthorized", message: "wrong key" },
      jest.fn(),
    ),
  );
  expect(
    screen.getByText(
      "This version of the app is no longer allowed in. Update the app.",
    ),
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
});

test("without a way to send the request again, no button", async () => {
  await render(failed({ kind: "unreachable", url: "http://192.168.1.23:8000" }));
  expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
});

test("the technical detail is written under the words in a development build", async () => {
  await render(
    failed({ kind: "unreachable", url: "http://192.168.1.23:8000" }, jest.fn()),
  );
  // Under jest, as in a development build.
  expect(
    screen.getByText("Cannot reach the API at http://192.168.1.23:8000."),
  ).toBeTruthy();
});
