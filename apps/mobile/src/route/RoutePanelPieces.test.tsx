import type { Activity, Shape } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { RouteChoice, RouteOutcome } from "./RoutePanel";
import { checkWord } from "./wordInput";

// The shapes in pieces in «Draw» (TASK-223): the switch of the pen up for
// the three the user chose, and the km of the drawing apart from the walks.

const SWITCH = "Lift the pen between parts";

function shapeChoice(
  shape: Shape,
  { on = true, onPenUp = jest.fn(), activity = "running" as Activity } = {},
) {
  return (
    <RouteChoice
      kind="shape"
      onKind={jest.fn()}
      shapeText={shape}
      shape={shape}
      onShapeText={jest.fn()}
      reading={null}
      onShapeDone={jest.fn()}
      wordText=""
      onWordText={jest.fn()}
      wordCheck={checkWord("", 6000)}
      letterStyle="round"
      onLetterStyle={jest.fn()}
      penUp={on}
      onPenUp={onPenUp}
      distanceText={activity === "paddling" ? "3" : "6"}
      distanceM={activity === "paddling" ? 3000 : 6000}
      image={{ status: "none" }}
      onChooseImage={jest.fn()}
      onDistanceText={jest.fn()}
      activity={activity}
    />
  );
}

test("the smiley, the ghost and the donut have the switch, on to start", async () => {
  for (const shape of ["smiley", "ghost", "donut"] as const) {
    const onPenUp = jest.fn();
    await render(shapeChoice(shape, { onPenUp }));
    const toggle = screen.getByRole("switch", { name: SWITCH, checked: true });
    await fireEvent.press(toggle);
    expect(onPenUp).toHaveBeenCalledWith(false);
  }
});

test("no switch for the sun, a shape without pieces, or on the water", async () => {
  await render(shapeChoice("sun"));
  expect(screen.queryByRole("switch")).toBeNull();
  await render(shapeChoice("heart"));
  expect(screen.queryByRole("switch")).toBeNull();
  await render(shapeChoice("donut", { activity: "paddling" }));
  expect(screen.queryByRole("switch")).toBeNull();
});

test("a shape in pieces shows the km of its drawing apart from the walks", async () => {
  // North in a line: drawing 0–100 m and 200–300 m, a walk of 100 m between.
  const metre = 1 / 111_195;
  const points = [0, 100, 200, 300].map((m): [number, number] => [
    46.0122 + m * metre,
    11.2986,
  ]);
  const result = {
    points,
    distance_m: 6100,
    similarity: 0.9,
    shape: "smiley" as const,
    word: null,
    warnings: [],
    directions: [],
    walks: [[1, 2]] as [number, number][],
  };
  const outcome = (activity: Activity) => (
    <RouteOutcome
      view={{
        status: "done",
        request: {
          start: points[0],
          shape: "smiley",
          pen_up: true,
          distance_m: 6000,
          activity,
        },
        result,
      }}
      onCancel={jest.fn()}
      exporting={{ status: "idle" }}
      onExport={jest.fn()}
      onTryDistance={jest.fn()}
      onPickShape={jest.fn()}
      onStart={jest.fn()}
    />
  );
  const { rerender } = await render(outcome("running"));
  expect(
    screen.getByText("6.0 km of drawing + 0.1 km walking between the parts"),
  ).toBeTruthy();
  await rerender(outcome("cycling"));
  expect(
    screen.getByText("6.0 km of drawing + 0.1 km riding between the parts"),
  ).toBeTruthy();
});
