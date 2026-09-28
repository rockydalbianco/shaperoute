import edited from "@shaperoute/shared-types/fixtures/image-outline-edited.json";
import imageOutline from "@shaperoute/shared-types/fixtures/image-outline.json";
import type { ImageOutline } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { ImageChoice } from "./ImageChoice";
import { type ImageEdits, ImageEditsContext } from "./imageEdits";
import { EDIT_REASON_TEXT } from "./problems";
import type { EditState, ImageState } from "./useImageOutline";

const PICTURE = { uri: "file:///apple.jpg", width: 800, height: 600 };
const TRACED: ImageState = {
  status: "traced",
  picture: PICTURE,
  outline: imageOutline as ImageOutline,
};

function edits(edit: EditState = { status: "idle" }, earlier: ImageOutline[] = []) {
  return { earlier, edit, add: jest.fn(), undo: jest.fn() } satisfies ImageEdits;
}

async function shown(value: ImageEdits | null, state: ImageState = TRACED) {
  await render(
    <ImageEditsContext.Provider value={value}>
      <ImageChoice state={state} onChoose={jest.fn()} />
    </ImageEditsContext.Provider>,
  );
  await fireEvent(screen.getByTestId("image-preview"), "layout", {
    nativeEvent: { layout: { width: 400, height: 0 } },
  });
}

test("a part or a detail is drawn on the picture once its button is on", async () => {
  const value = edits();
  await shown(value);
  // A square picture: a frame of 320 by 320 points (MAX_PREVIEW_HEIGHT).
  const frame = screen.getByTestId("preview-frame");
  expect(frame.props.onStartShouldSetResponder).toBeUndefined();
  await fireEvent.press(screen.getByText("Add a detail"));
  expect(screen.getByText(/Draw from the yellow line/)).toBeTruthy();
  await fireEvent(frame, "responderGrant", {
    nativeEvent: { locationX: 160, locationY: 240 },
  });
  await fireEvent(frame, "responderMove", {
    nativeEvent: { locationX: 160, locationY: 160 },
  });
  await fireEvent(frame, "responderRelease", {});
  expect(value.add).toHaveBeenCalledWith("detail", [
    [0.5, 0.75],
    [0.5, 0.5],
  ]);
  await fireEvent.press(screen.getByText("Add a part"));
  expect(screen.getByText(/Draw a closed shape across the yellow line/)).toBeTruthy();
  // Pressed again, the button is off and the picture takes no touches.
  await fireEvent.press(screen.getByText("Add a part"));
  expect(
    screen.getByTestId("preview-frame").props.onStartShouldSetResponder,
  ).toBeUndefined();
});

test("while a line is on its way nothing else is drawn", async () => {
  await shown(edits({ status: "sending", kind: "part" }));
  expect(screen.getByText("Adding the part…")).toBeTruthy();
  await fireEvent.press(screen.getByText("Add a part"));
  expect(
    screen.getByTestId("preview-frame").props.onStartShouldSetResponder,
  ).toBeUndefined();
});

test("a refused line says why in plain words", async () => {
  await shown(
    edits({
      status: "refused",
      kind: "detail",
      problem: {
        kind: "api_error",
        code: "outline_edit_rejected",
        message: "the detail must start on the yellow line",
        reason: "not_on_line",
      },
    }),
  );
  expect(screen.getByText(EDIT_REASON_TEXT.not_on_line)).toBeTruthy();
  expect(screen.getByText("the detail must start on the yellow line")).toBeTruthy();
});

test("Undo is off until something was added, then takes it away", async () => {
  const none = edits();
  await shown(none);
  await fireEvent.press(screen.getByText("Undo"));
  expect(none.undo).not.toHaveBeenCalled();
  const some = edits({ status: "idle" }, [imageOutline as ImageOutline]);
  await shown(some, { ...TRACED, outline: edited as ImageOutline });
  // The detail added is drawn over the picture.
  expect(screen.getAllByTestId("detail-side")).toHaveLength(1);
  await fireEvent.press(screen.getByText("Undo"));
  expect(some.undo).toHaveBeenCalled();
});

test("without the editor the outline is only shown", async () => {
  await shown(null);
  expect(screen.getByTestId("image-preview")).toBeTruthy();
  expect(screen.queryByText("Add a part")).toBeNull();
  expect(screen.queryByText("Undo")).toBeNull();
});
