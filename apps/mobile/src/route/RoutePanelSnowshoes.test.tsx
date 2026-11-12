/**
 * «Draw» on the snow (TASK-413 part B, ADR-0342): a shape of the catalogue
 * only, no word, no picture, no drawing by hand (the engine refuses it,
 * ON_SNOW_SHAPES_ONLY), 0.5–3 km, no pen switch since a shape in pieces is
 * always drawn apart, and a route that says it is on the snow and starts
 * with «Start» though it has no turns.
 */
import jobDone from "@shaperoute/shared-types/fixtures/route-job-done.json";
import type { RouteRequest, RouteResult } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { saveUnitsChoice } from "../units/units";
import { toDistanceM } from "./distance";
import { RouteChoice, RouteOutcome } from "./RoutePanel";
import { checkWord } from "./wordInput";

function choice(distanceText: string, onDistanceText: jest.Mock = jest.fn()) {
  const distanceM = toDistanceM(distanceText, "snowshoeing");
  return (
    <RouteChoice
      kind="shape"
      onKind={jest.fn()}
      shapeText="cat"
      shape="cat"
      onShapeText={jest.fn()}
      reading={null}
      onShapeDone={jest.fn()}
      wordText=""
      onWordText={jest.fn()}
      wordCheck={checkWord("", distanceM, "snowshoeing")}
      letterStyle="round"
      onLetterStyle={jest.fn()}
      penUp={false}
      onPenUp={jest.fn()}
      distanceText={distanceText}
      distanceM={distanceM}
      image={{ status: "none" }}
      onChooseImage={jest.fn()}
      onDistanceText={onDistanceText}
      activity="snowshoeing"
      onFreehand={jest.fn()}
    />
  );
}

afterEach(() => saveUnitsChoice("km"));

test("on the snow a shape only: no word, no picture, no «Freehand»", async () => {
  await render(choice("1"));
  expect(
    screen
      .getAllByText(/^(Freehand|Shape|Word|Image)$/)
      .map((text) => text.props.children as string),
  ).toEqual(["Shape"]);
  expect(screen.queryByRole("button", { name: "Freehand" })).toBeNull();
  expect(screen.getByTestId("shape-grid")).toBeTruthy();
});

test("a shape in pieces has no pen switch: on the snow it is always apart", async () => {
  await render(choice("1"));
  expect(screen.queryByText("Lift the pen between parts")).toBeNull();
});

test("the distance keeps to 0.5–3 km", async () => {
  const onDistanceText = jest.fn();
  const { rerender } = await render(choice("4", onDistanceText));
  expect(screen.getByText(/Enter a distance between 0[.,]5 and 3 km\./)).toBeTruthy();
  await rerender(choice("1.5", onDistanceText));
  expect(screen.queryByText(/Enter a distance/)).toBeNull();
});

const snowCat: RouteRequest = {
  start: [46.3, 11.5],
  shape: "cat",
  distance_m: 1500,
  activity: "snowshoeing",
};

/** A route on the snow as the API sends it: no turns, no alternatives. */
const onSnow: RouteResult = {
  ...(jobDone.result as unknown as RouteResult),
  similarity: 1,
  distance_m: 1520,
  directions: [],
  alternatives: [],
  warnings: [],
};

function done(onStart: jest.Mock) {
  return (
    <RouteOutcome
      view={{ status: "done", request: snowCat, result: onSnow }}
      onCancel={jest.fn()}
      exporting={{ status: "idle" }}
      onExport={jest.fn()}
      onTryDistance={jest.fn()}
      onPickShape={jest.fn()}
      onStart={onStart}
      onSignal={jest.fn()}
    />
  );
}

test("a route on the snow says so, and has «Start» without turns", async () => {
  const onStart = jest.fn();
  await render(done(onStart));
  expect(screen.getByText("cat · on the snow · target 1.5 km")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Start" }));
  expect(onStart).toHaveBeenCalledTimes(1);
});

test("in miles too", async () => {
  saveUnitsChoice("mi");
  await render(done(jest.fn()));
  expect(screen.getByText(/^cat · on the snow · target [\d.]+ mi$/)).toBeTruthy();
});
