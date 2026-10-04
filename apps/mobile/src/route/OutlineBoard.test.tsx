import type { ImageOutline } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { ImageEdits } from "./imageEdits";
import { OutlineBoard } from "./OutlineBoard";
import { EDIT_REASON_TEXT } from "./problems";
import type { EditState } from "./useImageOutline";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const PICTURE = { uri: "file:///apple.jpg", width: 800, height: 600 };
// A 4:3 picture: on a 400 × 700 board it is 400 × 300, 200 points down.
const OUTLINE: ImageOutline = {
  points: [
    [-1, -0.5],
    [1, -0.5],
    [0, 0.5],
    [-1, -0.5],
  ],
  image_points: [
    [0.1, 0.9],
    [0.9, 0.9],
    [0.5, 0.1],
    [0.1, 0.9],
  ],
  aspect: 4 / 3,
  strokes: [],
  image_strokes: [],
};

function edits(edit: EditState = { status: "idle" }, earlier: ImageOutline[] = []) {
  return { earlier, edit, add: jest.fn(), undo: jest.fn() } satisfies ImageEdits;
}

function fingers(...points: [number, number][]) {
  const [x, y] = points[0];
  return {
    nativeEvent: {
      locationX: x,
      locationY: y,
      touches: points.map(([locationX, locationY]) => ({ locationX, locationY })),
    },
  };
}

async function board(value: ImageEdits = edits(), onClose = jest.fn()) {
  await render(
    <OutlineBoard
      visible
      onClose={onClose}
      picture={PICTURE}
      outline={OUTLINE}
      edits={value}
    />,
  );
  const area = screen.getByTestId("outline-board");
  await fireEvent(area, "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 700 } },
  });
  return area;
}

function transformOf() {
  const style = [screen.getByTestId("board-picture").props.style].flat(Infinity);
  const transform = Object.assign({}, ...style).transform as Record<string, number>[];
  return Object.assign({}, ...transform) as {
    translateX: number;
    translateY: number;
    scale: number;
  };
}

test("the picture fills the board, with the outline over it", async () => {
  await board();
  expect(screen.getByTestId("board-picture")).toHaveStyle({
    left: 0,
    top: 200,
    width: 400,
    height: 300,
  });
  expect(screen.getAllByTestId("outline-side")).toHaveLength(3);
  expect(screen.getByText(/Two fingers zoom/)).toBeTruthy();
});

test("with a button on, one finger draws, and the line goes out when it lifts", async () => {
  const value = edits();
  const area = await board(value);
  await fireEvent.press(screen.getByText("Add a detail"));
  expect(screen.getByText(/joined to the nearest yellow line/)).toBeTruthy();
  await fireEvent(area, "responderGrant", fingers([200, 470]));
  await fireEvent(area, "responderMove", fingers([200, 350]));
  // The line follows the finger before it is sent.
  expect(screen.getAllByTestId("drawn-side")).toHaveLength(1);
  await fireEvent(area, "responderRelease", fingers([200, 350]));
  expect(value.add).toHaveBeenCalledWith("detail", [
    [0.5, 0.9],
    [0.5, 0.5],
  ]);
  expect(screen.queryAllByTestId("drawn-side")).toHaveLength(0);
});

test("two fingers zoom, drop the line, and Fit puts the picture back", async () => {
  const value = edits();
  const area = await board(value);
  await fireEvent.press(screen.getByText("Add a part"));
  await fireEvent(area, "responderGrant", fingers([150, 350]));
  await fireEvent(area, "responderMove", fingers([150, 350], [250, 350]));
  await fireEvent(area, "responderMove", fingers([100, 350], [300, 350]));
  expect(transformOf().scale).toBeCloseTo(2);
  // One finger lifted: the other does not start drawing.
  await fireEvent(area, "responderMove", fingers([120, 350]));
  await fireEvent(area, "responderRelease", fingers([120, 350]));
  expect(value.add).not.toHaveBeenCalled();
  // Zoomed, the same stroke on the screen is a shorter one on the picture.
  await fireEvent(area, "responderGrant", fingers([200, 350]));
  await fireEvent(area, "responderMove", fingers([300, 350]));
  await fireEvent(area, "responderRelease", fingers([300, 350]));
  expect(value.add).toHaveBeenCalledWith("part", [
    [0.5, 0.5],
    [0.625, 0.5],
  ]);
  await fireEvent.press(screen.getByText("Fit"));
  expect(transformOf()).toEqual({ translateX: 0, translateY: 0, scale: 1 });
  expect(screen.queryByText("Fit")).toBeNull();
});

test("with no button on, one finger moves the zoomed picture", async () => {
  const value = edits();
  const area = await board(value);
  await fireEvent(area, "responderGrant", fingers([150, 350]));
  await fireEvent(area, "responderMove", fingers([150, 350], [250, 350]));
  await fireEvent(area, "responderMove", fingers([100, 350], [300, 350]));
  await fireEvent(area, "responderRelease", fingers([100, 350]));
  await fireEvent(area, "responderGrant", fingers([200, 350]));
  await fireEvent(area, "responderMove", fingers([230, 330]));
  await fireEvent(area, "responderRelease", fingers([230, 330]));
  expect(transformOf()).toMatchObject({ translateX: 30, translateY: -20 });
  expect(value.add).not.toHaveBeenCalled();
});

test("while a line is on its way, a finger only moves the picture", async () => {
  const value = edits({ status: "sending", kind: "part" });
  const area = await board(value);
  expect(screen.getByText("Adding the part…")).toBeTruthy();
  await fireEvent.press(screen.getByText("Add a part"));
  await fireEvent(area, "responderGrant", fingers([200, 350]));
  await fireEvent(area, "responderMove", fingers([300, 350]));
  await fireEvent(area, "responderRelease", fingers([300, 350]));
  expect(value.add).not.toHaveBeenCalled();
});

test("a refused line says why; Undo and Save do what they say", async () => {
  const value = edits(
    {
      status: "refused",
      kind: "detail",
      problem: {
        kind: "api_error",
        code: "outline_edit_rejected",
        message: "the line is too short: draw a longer one",
        reason: "short",
      },
    },
    [OUTLINE],
  );
  const onClose = jest.fn();
  await board(value, onClose);
  expect(screen.getByText(EDIT_REASON_TEXT.short)).toBeTruthy();
  await fireEvent.press(screen.getByText("Undo"));
  expect(value.undo).toHaveBeenCalled();
  await fireEvent.press(screen.getByText("Save"));
  expect(onClose).toHaveBeenCalled();
  // One way out, at the foot: nothing left in the top right corner.
  expect(screen.queryByText("Done")).toBeNull();
});

test("Undo is off until something was added", async () => {
  const value = edits();
  await board(value);
  await fireEvent.press(screen.getByText("Undo"));
  expect(value.undo).not.toHaveBeenCalled();
});
