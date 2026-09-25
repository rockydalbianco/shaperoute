import { render, screen } from "@testing-library/react-native";

import { RouteChoice } from "./RoutePanel";
import type { ShapeReadingState } from "./useShapeReading";

function choice(reading: ShapeReadingState | null) {
  return (
    <RouteChoice
      shapeText="stemma della Ferrari"
      shape={null}
      onShapeText={jest.fn()}
      reading={reading}
      onShapeDone={jest.fn()}
      distanceText="5"
      distanceM={5000}
      onDistanceText={jest.fn()}
    />
  );
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test("while the AI reads the words, a bar under the note", async () => {
  await render(choice({ status: "reading" }));
  expect(screen.getByText("The AI is reading it…")).toBeTruthy();
  expect(screen.getByTestId("reading-loading")).toBeTruthy();
});

test("once read, the bar is gone", async () => {
  await render(choice({ status: "read", shape: "horse" }));
  expect(screen.queryByTestId("reading-loading")).toBeNull();
});
