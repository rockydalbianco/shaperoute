import type {
  ImageRouteRequest,
  RouteRequest,
  RouteResult,
} from "@shaperoute/shared-types";
import result from "@shaperoute/shared-types/fixtures/route-result.json";
import { render, screen } from "@testing-library/react-native";

import { saveLanguageChoice } from "../i18n/language";
import { choicesOf } from "./choices";
import { RouteOutcome } from "./RoutePanel";
import type { AnyRouteRequest } from "./useRouteRequest";

// A drawing made by hand, drawn where it was drawn (TASK-347 part C3b,
// ADR-0300): under the route, the score of the drawing becomes the engine's
// likeness of the route to it. Free drawings and shapes show none.

const START: [number, number] = [46.0671, 11.1214];
const OUTLINE: [number, number][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
  [0, 0],
];
const ANCHORED: ImageRouteRequest = {
  start: START,
  outline: OUTLINE,
  distance_m: 3300,
  activity: "running",
  placement: "anchored",
};
const FREE: ImageRouteRequest = { ...ANCHORED, placement: "free" };
const SHAPE: RouteRequest = {
  start: START,
  shape: "heart",
  distance_m: 5000,
  activity: "running",
};
const WHOLE = result as unknown as RouteResult;
const ALONE: RouteResult = { ...WHOLE, similarity: 0.734, alternatives: [] };

function done(request: AnyRouteRequest, route: RouteResult) {
  return (
    <RouteOutcome
      view={{ status: "done", request, result: route }}
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

afterEach(() => saveLanguageChoice("phone"));

test("an anchored drawing says how closely the roads follow it, from the engine", async () => {
  await render(done(ANCHORED, ALONE));
  expect(screen.getByTestId("route-score")).toHaveTextContent(
    "Roads follow your drawing: 73%",
  );
});

test("the same line in Italian, the text of the drawing under the map", async () => {
  saveLanguageChoice("it");
  await render(done(ANCHORED, ALONE));
  expect(screen.getByTestId("route-score")).toHaveTextContent(
    "Le strade seguono il tuo disegno: 73%",
  );
});

test("a drawing placed by the search, or a shape, shows no score line", async () => {
  await render(done(FREE, ALONE));
  expect(screen.queryByTestId("route-score")).toBeNull();
  await render(done(SHAPE, ALONE));
  expect(screen.queryByTestId("route-score")).toBeNull();
});

test("with routes to choose from, the tiles say each one's likeness instead", async () => {
  await render(done(ANCHORED, WHOLE));
  expect(screen.getAllByRole("radio").length).toBeGreaterThan(1);
  expect(screen.queryByTestId("route-score")).toBeNull();
});
