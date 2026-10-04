import edited from "@shaperoute/shared-types/fixtures/image-outline-edited.json";
import imageOutline from "@shaperoute/shared-types/fixtures/image-outline.json";
import type { ImageOutline } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { ImageChoice } from "./ImageChoice";
import { type ImageEdits, ImageEditsContext } from "./imageEdits";
import type { ImageState } from "./useImageOutline";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const PICTURE = { uri: "file:///apple.jpg", width: 800, height: 600 };
const TRACED: ImageState = {
  status: "traced",
  picture: PICTURE,
  outline: imageOutline as ImageOutline,
};

function edits(): ImageEdits {
  return { earlier: [], edit: { status: "idle" }, add: jest.fn(), undo: jest.fn() };
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

test("the preview only shows the outline; editing opens the full-screen board", async () => {
  await shown(edits());
  expect(screen.queryByTestId("outline-board")).toBeNull();
  await fireEvent.press(screen.getByText("Edit the outline"));
  expect(screen.getByTestId("outline-board")).toBeTruthy();
  expect(screen.getByText("Add a part")).toBeTruthy();
  await fireEvent.press(screen.getByText("Save"));
  expect(screen.queryByTestId("outline-board")).toBeNull();
});

test("the details added are drawn in the preview", async () => {
  await shown(edits(), { ...TRACED, outline: edited as ImageOutline });
  expect(screen.getAllByTestId("detail-side")).toHaveLength(1);
});

test("without the editor the outline is only shown", async () => {
  await shown(null);
  expect(screen.getByTestId("image-preview")).toBeTruthy();
  expect(screen.queryByText("Edit the outline")).toBeNull();
});
