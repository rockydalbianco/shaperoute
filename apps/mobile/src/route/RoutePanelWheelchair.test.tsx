/**
 * «Draw» in a wheelchair or pushing a stroller (TASK-414 part B, ADR-0343):
 * a circle, a heart, a star or a moon of 1–5 km, nothing else. No word, no
 * picture, no drawing by hand, no shape typed; a shape chosen before that
 * is not one of the four is not shown; after a shape that does not fit,
 * only the four are offered; the caution under every route.
 */
import type { RouteRequest, RouteResult, Shape } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { toDistanceM } from "./distance";
import type { ChoiceKind } from "./problems";
import { RouteChoice, RouteOutcome } from "./RoutePanel";
import { gridShapes } from "./ShapeGrid";
import { checkWord } from "./wordInput";

const CAUTION =
  "Map data can miss kerbs, steps and steep slopes: check the route before you set off.";

function choice({
  kind = "shape",
  shape = "heart",
  distanceText = "3",
  onShapeText = jest.fn(),
  onFreehand = jest.fn(),
}: {
  kind?: ChoiceKind;
  shape?: Shape | null;
  distanceText?: string;
  onShapeText?: jest.Mock;
  onFreehand?: jest.Mock;
} = {}) {
  const distanceM = toDistanceM(distanceText, "wheelchair");
  return (
    <RouteChoice
      kind={kind}
      onKind={jest.fn()}
      shapeText={shape ?? ""}
      shape={shape}
      onShapeText={onShapeText}
      reading={null}
      onShapeDone={jest.fn()}
      wordText=""
      onWordText={jest.fn()}
      wordCheck={checkWord("", distanceM, "wheelchair")}
      letterStyle="round"
      onLetterStyle={jest.fn()}
      distanceText={distanceText}
      distanceM={distanceM}
      image={{ status: "none" }}
      onChooseImage={jest.fn()}
      onDistanceText={jest.fn()}
      activity="wheelchair"
      onFreehand={onFreehand}
    />
  );
}

test("only the shapes: no «Freehand», no word, no picture, no shape typed", async () => {
  await render(choice());
  expect(
    screen
      .getAllByText(/^(Freehand|Shape|Word|Image)$/)
      .map((text) => text.props.children as string),
  ).toEqual(["Shape"]);
  expect(screen.queryByRole("button", { name: "Freehand" })).toBeNull();
  expect(screen.getByTestId("shape-grid")).toBeTruthy();
  expect(screen.queryByTestId("other-shape-link")).toBeNull();
});

test("the grid has the four shapes, all in sight, and picks one", async () => {
  const onShapeText = jest.fn();
  await render(choice({ onShapeText }));
  for (const name of ["circle", "heart", "star", "moon"]) {
    expect(screen.getByRole("button", { name })).toBeTruthy();
  }
  expect(screen.queryByRole("button", { name: "horse" })).toBeNull();
  expect(screen.queryByTestId("shape-grid-more")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "moon" }));
  expect(onShapeText).toHaveBeenLastCalledWith("moon");
  expect(screen.getByTestId("shape-preview")).toBeTruthy();
  // The grid shows a sport's shapes whole, open or closed.
  expect(gridShapes("horse", false, ["circle", "heart", "star", "moon"])).toEqual([
    "circle",
    "heart",
    "star",
    "moon",
  ]);
});

test("a shape chosen before that is not one of the four waits: none is shown", async () => {
  await render(choice({ shape: "horse" }));
  expect(screen.queryByTestId("shape-preview")).toBeNull();
  for (const name of ["circle", "heart", "star", "moon"]) {
    expect(screen.getByRole("button", { name })).not.toBeSelected();
  }
});

test("a word or a picture chosen before shows the four shapes", async () => {
  for (const kind of ["word", "image"] as const) {
    await render(choice({ kind }));
    expect(screen.queryByLabelText("Word")).toBeNull();
    expect(screen.getByRole("button", { name: "Shape" })).toBeSelected();
    expect(screen.getByTestId("shape-grid")).toBeTruthy();
  }
});

test("the distance keeps to 1–5 km", async () => {
  await render(choice({ distanceText: "6" }));
  expect(screen.getByText("Enter a distance between 1 and 5 km.")).toBeTruthy();
});

const REQUEST: RouteRequest = {
  start: [46.0671, 11.1214],
  shape: "heart",
  distance_m: 3000,
  activity: "wheelchair",
};

test("a shape that does not fit offers only the four", async () => {
  await render(
    <RouteOutcome
      view={{
        status: "failed",
        request: REQUEST,
        problem: { kind: "api_error", code: "shape_not_drawable", message: "no" },
      }}
      onCancel={jest.fn()}
      exporting={{ status: "idle" }}
      onExport={jest.fn()}
      onTryDistance={jest.fn()}
      onPickShape={jest.fn()}
      onStart={jest.fn()}
    />,
  );
  expect(screen.getByText(/This shape does not fit the roads here/)).toBeTruthy();
  for (const name of ["circle", "heart", "star", "moon"]) {
    expect(screen.getByText(name)).toBeTruthy();
  }
  expect(screen.queryByText("horse")).toBeNull();
});

test("every wheelchair route says the map can miss kerbs, steps and slopes", async () => {
  const result: RouteResult = {
    points: [
      [46.0671, 11.1214],
      [46.068, 11.122],
    ],
    distance_m: 3000,
    similarity: 0.7,
    shape: "heart",
    warnings: [],
    directions: [],
  };
  await render(
    <RouteOutcome
      view={{ status: "done", request: REQUEST, result }}
      onCancel={jest.fn()}
      exporting={{ status: "idle" }}
      onExport={jest.fn()}
      onTryDistance={jest.fn()}
      onPickShape={jest.fn()}
      onStart={jest.fn()}
    />,
  );
  expect(screen.getByText(CAUTION)).toBeTruthy();
});
