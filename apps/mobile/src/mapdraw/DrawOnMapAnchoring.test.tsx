import { act, render, screen } from "@testing-library/react-native";
import type { ComponentProps } from "react";

import { saveLanguageChoice } from "../i18n/language";
import type { Anchoring } from "./anchoring";
import { DrawOnMap } from "./DrawOnMap";

/** Under the map of «Draw on the map», a drawing anchored to the roads
 * (TASK-347 part C): «Snapping to roads…», the score, the notice. */

function show(anchoring?: Anchoring) {
  const props: ComponentProps<typeof DrawOnMap> = {
    mode: "draw",
    onMode: jest.fn(),
    placed: null,
    onPick: jest.fn(),
    onSample: jest.fn(),
    photo: { status: "none" },
    onPhoto: jest.fn(),
    onUndo: jest.fn(),
    canUndo: false,
    onRedo: jest.fn(),
    canRedo: false,
    onClear: jest.fn(),
    distanceM: 5_000,
    problem: null,
    onDraw: jest.fn(),
    anchoring,
  };
  return render(<DrawOnMap {...props} />);
}

afterEach(async () => {
  await act(async () => saveLanguageChoice("phone"));
});

test("without anchoring, nothing new under the map", async () => {
  await show();
  expect(screen.queryByTestId("map-snapping")).toBeNull();
  expect(screen.queryByTestId("map-score")).toBeNull();
  expect(screen.queryByTestId("map-off-roads")).toBeNull();
});

test("while a stroke is anchored, «Snapping to roads…»", async () => {
  await show({ snapping: true, score: 80, offRoads: false });
  expect(screen.getByTestId("map-snapping")).toHaveTextContent("Snapping to roads…");
  expect(screen.queryByTestId("map-score")).toBeNull();
});

test("then how closely the roads follow the drawing", async () => {
  await show({ snapping: false, score: 87, offRoads: false });
  expect(screen.getByTestId("map-score")).toHaveTextContent(
    "Roads follow your drawing: 87%",
  );
});

test("no score before a stroke is anchored", async () => {
  await show({ snapping: false, score: null, offRoads: false });
  expect(screen.queryByTestId("map-score")).toBeNull();
});

test("a stroke in the fields says so in the note", async () => {
  await show({ snapping: false, score: 40, offRoads: true });
  expect(screen.getByTestId("map-off-roads")).toHaveTextContent(
    "No roads here: this line stays as you drew it.",
  );
  expect(
    screen.queryByText("Draw a line with one finger.", { exact: false }),
  ).toBeNull();
});

test("in Italian", async () => {
  await act(async () => saveLanguageChoice("it"));
  await show({ snapping: false, score: 87, offRoads: false });
  expect(screen.getByTestId("map-score")).toHaveTextContent(
    "Le strade seguono il tuo disegno: 87%",
  );
});
