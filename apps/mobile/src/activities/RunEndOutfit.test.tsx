import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import type { PickedDrawingPhoto } from "../social/pickDrawingPhoto";
import {
  ActivitiesContext,
  type ActivitiesDoor,
  useActivitiesDoor,
} from "./activitiesDoor";
import { RunEnd } from "./RunEnd";

// The items tagged on the photos at the end of a run (TASK-394 part B):
// held until «Save», then told with the photos, in the post's order; a
// photo taken off takes its items.

jest.mock("expo-file-system", () =>
  jest.requireActual("../social/outfit/memoryFiles.testing").memoryFiles(),
);
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("../settings/useSport", () => ({ useSport: () => "run" }));

const picked = jest.fn(async (): Promise<PickedDrawingPhoto> => ({
  kind: "picked",
  base64: "c2hydW5r",
  width: 1080,
  height: 810,
}));

function WithDoor({ door }: { door: Partial<ActivitiesDoor> }) {
  const nothing = useActivitiesDoor();
  return (
    <ActivitiesContext.Provider
      value={{ ...nothing, signedIn: true, owner: 7, ...door }}
    >
      <RunEnd onSave={() => true} onDiscard={jest.fn()} pick={picked} />
    </ActivitiesContext.Provider>
  );
}

function spies() {
  return {
    toDrawing: jest.fn(),
    toPhotos: jest.fn(),
    toOrder: jest.fn(),
    toStrava: jest.fn(),
    toOutfit: jest.fn(),
  };
}

async function addPhoto(n: number) {
  await fireEvent.press(screen.getByRole("button", { name: "Add photo" }));
  await fireEvent.press(screen.getByRole("button", { name: "Choose a picture" }));
  expect(await screen.findByLabelText(`Photo ${n}`)).toBeTruthy();
}

async function tagShoes(n: number, brand: string) {
  await fireEvent.press(screen.getByTestId(`tile-photo-${n}`));
  await fireEvent.press(screen.getByRole("button", { name: "Tag what you wear" }));
  await fireEvent.press(screen.getByTestId("outfit-photo"), {
    nativeEvent: { locationX: 359, locationY: 449 },
  });
  await fireEvent.changeText(screen.getByTestId("outfit-brand"), brand);
  await fireEvent.press(screen.getByTestId("outfit-add"));
  await fireEvent.press(screen.getByTestId("outfit-editor-done"));
  await waitFor(() => expect(screen.queryByTestId("outfit-editor")).toBeNull());
  // The photo chosen again, as it was.
  await fireEvent.press(screen.getByTestId(`tile-photo-${n}`));
}

const shoes = (brand: string) => ({
  id: null,
  x: 0.5,
  y: 0.5,
  item: "shoes",
  brand,
  product_name: null,
  url: null,
});

async function save() {
  await fireEvent.press(screen.getByRole("button", { name: "Save to My activities" }));
}

test("«Save» tells the items of each photo, in the post's order", async () => {
  const door = spies();
  await render(<WithDoor door={door} />);
  await addPhoto(1);
  await addPhoto(2);
  await tagShoes(2, "Hoka");
  // The second photo first in the post.
  await fireEvent(screen.getByTestId("tile-photo-2"), "accessibilityAction", {
    nativeEvent: { actionName: "moveLeft" },
  });
  await save();
  expect(door.toPhotos).toHaveBeenCalledWith(["c2hydW5r", "c2hydW5r"]);
  expect(door.toOutfit).toHaveBeenCalledWith([[shoes("Hoka")], []]);
});

test("a photo taken off takes its items, and its place is free", async () => {
  const door = spies();
  await render(<WithDoor door={door} />);
  await addPhoto(1);
  await tagShoes(1, "Nike");
  await fireEvent.press(screen.getByRole("button", { name: "Remove photo 1" }));
  await addPhoto(1);
  await save();
  expect(door.toOutfit).toHaveBeenCalledWith([[]]);
});
