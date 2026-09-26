import { fireEvent, render, screen } from "@testing-library/react-native";

import { ImagePreview, MAX_PREVIEW_HEIGHT, segmentsOf } from "./ImagePreview";

const PICTURE = { uri: "file:///apple.jpg", width: 800, height: 600 };
const SQUARE: [number, number][] = [
  [0.25, 0.25],
  [0.75, 0.25],
  [0.75, 0.75],
  [0.25, 0.75],
  [0.25, 0.25],
];

test("each side of the outline is a thin box along it, in the box's points", () => {
  const [top, right, , left] = segmentsOf(SQUARE, 400, 300);
  // 0.25-0.75 of 400 across: 200 long, plus the line's width for the corners.
  expect(top).toEqual({ left: 98.5, top: 73.5, length: 203, angle: 0 });
  expect(right.length).toBe(153);
  expect(right.angle).toBeCloseTo(Math.PI / 2);
  expect(left.angle).toBeCloseTo(-Math.PI / 2);
  const dot: [number, number][] = [
    [0.5, 0.5],
    [0.5, 0.5],
  ];
  expect(segmentsOf(dot, 400, 300)).toEqual([]);
});

async function shown(showPicture: boolean, room: number, aspect = 4 / 3) {
  await render(
    <ImagePreview
      picture={PICTURE}
      points={SQUARE}
      aspect={aspect}
      showPicture={showPicture}
    />,
  );
  await fireEvent(screen.getByTestId("image-preview"), "layout", {
    nativeEvent: { layout: { width: room, height: 0 } },
  });
}

test("the outline is drawn over the picture once the room is known", async () => {
  await shown(true, 360);
  expect(screen.getAllByTestId("outline-side")).toHaveLength(4);
  expect(screen.getByTestId("preview-picture")).toBeTruthy();
  const frame = screen.getByLabelText("The outline traced from the picture");
  expect(frame).toHaveStyle({ width: 360, height: 270 });
});

test("without the picture only the line is left", async () => {
  await shown(false, 360);
  expect(screen.getAllByTestId("outline-side")).toHaveLength(4);
  expect(screen.queryByTestId("preview-picture")).toBeNull();
});

test("a tall picture is kept low enough to see the rest", async () => {
  await shown(true, 360, 0.5);
  const frame = screen.getByLabelText("The outline traced from the picture");
  expect(frame).toHaveStyle({
    width: MAX_PREVIEW_HEIGHT * 0.5,
    height: MAX_PREVIEW_HEIGHT,
  });
});
