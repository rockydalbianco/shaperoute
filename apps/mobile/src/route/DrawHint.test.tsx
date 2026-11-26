import { render, screen } from "@testing-library/react-native";

import { DrawHint, drawMissing } from "./DrawHint";

describe("drawMissing", () => {
  test("the start comes first, as on the page", () => {
    expect(drawMissing({ start: false, shape: false })).toBe("start");
    expect(drawMissing({ start: false, shape: true })).toBe("start");
  });

  test("then the shape", () => {
    expect(drawMissing({ start: true, shape: false })).toBe("shape");
  });

  test("nothing when both are there", () => {
    expect(drawMissing({ start: true, shape: true })).toBeNull();
  });
});

describe("DrawHint", () => {
  test("says to choose a start", async () => {
    await render(<DrawHint missing="start" />);
    expect(screen.getByTestId("draw-hint")).toHaveTextContent("Choose a start first");
  });

  test("says to choose what to draw", async () => {
    await render(<DrawHint missing="shape" />);
    expect(screen.getByTestId("draw-hint")).toHaveTextContent(
      "Choose what to draw first",
    );
  });

  test("no line when the button is on", async () => {
    await render(<DrawHint missing={null} />);
    expect(screen.queryByTestId("draw-hint")).toBeNull();
  });
});
