import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { color } from "../theme/tokens";
import { EditorCell } from "./EditorCell";
import type { Cell } from "./flightLayout";

const GRID = { cellW: 90, cellH: 100, gap: 6 };
const CELL: Cell = { widget: "altitude", col: 0, row: 0, w: 2, h: 1 };

const touch = (x: number, y: number) => ({ nativeEvent: { pageX: x, pageY: y } });

async function show(selected = false) {
  const handlers = { onSelect: jest.fn(), onDrop: jest.fn(), onStretch: jest.fn() };
  await render(
    <EditorCell
      cell={CELL}
      grid={GRID}
      selected={selected}
      palette={color}
      testID="cell"
      {...handlers}
    >
      <Text>GPS altitude</Text>
    </EditorCell>,
  );
  return handlers;
}

async function dragOn(testID: string, from: [number, number], to: [number, number]) {
  const view = screen.getByTestId(testID);
  await fireEvent(view, "startShouldSetResponderCapture", touch(...from));
  await fireEvent(view, "responderGrant", touch(...from));
  await fireEvent(view, "responderMove", touch(...to));
  return view;
}

it("selects on a touch that does not move", async () => {
  const handlers = await show();
  await fireEvent.press(screen.getByTestId("cell"));
  expect(handlers.onSelect).toHaveBeenCalled();
  expect(handlers.onDrop).not.toHaveBeenCalled();
});

it("drags the widget and lets go on the nearest cell", async () => {
  const handlers = await show();
  const view = await dragOn("cell-drag", [100, 100], [200, 210]);
  // While it moves, an outline shows where it will land.
  expect(screen.getByTestId("cell-landing")).toBeTruthy();
  await fireEvent(view, "responderRelease", touch(200, 210));
  // 100 points right is one cell of 96, 110 down one of 106.
  expect(handlers.onDrop).toHaveBeenCalledWith(1, 1);
  expect(screen.queryByTestId("cell-landing")).toBeNull();
});

it("sizes the selected widget from its corner", async () => {
  const handlers = await show(true);
  const handle = await dragOn("cell-handle", [190, 100], [190, 320]);
  await fireEvent(handle, "responderRelease", touch(190, 320));
  expect(handlers.onStretch).toHaveBeenCalledWith(2, 3);
});

it("has no corner handle until selected", async () => {
  await show();
  expect(screen.queryByTestId("cell-handle")).toBeNull();
});

it("goes back where it was when the drag is taken away", async () => {
  const handlers = await show();
  const view = await dragOn("cell-drag", [100, 100], [300, 300]);
  await fireEvent(view, "responderTerminate", touch(300, 300));
  expect(handlers.onDrop).not.toHaveBeenCalled();
  expect(screen.queryByTestId("cell-landing")).toBeNull();
});
