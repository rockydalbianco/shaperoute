import type { RouteRequest, RouteResult } from "@shaperoute/shared-types";
import result from "@shaperoute/shared-types/fixtures/route-result.json";
import { render, screen } from "@testing-library/react-native";

import { choicesOf } from "./choices";
import { RouteOutcome } from "./RoutePanel";

// The first route is on screen and the others are still coming (TASK-435,
// ADR-0361): the panel says so, until they have come.

const request: RouteRequest = {
  start: [46.0671, 11.1214],
  shape: "heart",
  distance_m: 5000,
  activity: "running",
};
const WHOLE = result as unknown as RouteResult;
const FIRST: RouteResult = { ...WHOLE, alternatives: [] };

function done(route: RouteResult, more?: true) {
  return (
    <RouteOutcome
      view={{ status: "done", request, result: route, ...(more ? { more } : {}) }}
      onCancel={jest.fn()}
      exporting={{ status: "idle" }}
      onExport={jest.fn()}
      onTryDistance={jest.fn()}
      onPickShape={jest.fn()}
      onStart={jest.fn()}
      onSignal={jest.fn()}
      choices={choicesOf(route)}
      chosen={0}
    />
  );
}

test("with the first route alone, the panel says the others are coming", async () => {
  await render(done(FIRST, true));
  expect(screen.getByText("Looking for other routes…")).toBeTruthy();
  // The route is there to use: no tiles yet, with one route.
  expect(screen.queryByRole("radio")).toBeNull();
});

test("once the others have come, the line goes and the tiles are there", async () => {
  await render(done(WHOLE));
  expect(screen.queryByText("Looking for other routes…")).toBeNull();
  expect(screen.getAllByRole("radio")).toHaveLength(choicesOf(WHOLE).length);
});
