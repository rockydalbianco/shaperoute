import { fireEvent, render, screen } from "@testing-library/react-native";

import { NOT_CHOSEN } from "../api/drawings";
import type { PickedDrawingPhoto } from "../social/pickDrawingPhoto";
import { ONLY_ME_PHOTOS } from "../social/PublicParts";
import {
  ActivitiesContext,
  type ActivitiesDoor,
  useActivitiesDoor,
} from "./activitiesDoor";
import { RunEnd } from "./RunEnd";

// The form at the end of a run (TASK-208): «Only me» and the sport of
// «Settings» at every run; what is chosen goes with «Save», the photos too.

jest.mock("expo-file-system");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

let mockSport: "run" | "bike" | "paddle" = "run";
jest.mock("../settings/useSport", () => ({ useSport: () => mockSport }));

const picked = jest.fn(async (): Promise<PickedDrawingPhoto> => ({
  kind: "picked",
  base64: "c2hydW5r",
  width: 1080,
  height: 810,
}));

function WithDoor({ door }: { door: Partial<ActivitiesDoor> }) {
  const nothing = useActivitiesDoor();
  return (
    <ActivitiesContext.Provider value={{ ...nothing, signedIn: true, ...door }}>
      <RunEnd onSave={() => true} onDiscard={jest.fn()} pick={picked} />
    </ActivitiesContext.Provider>
  );
}

function spies() {
  return { toDrawing: jest.fn(), toPhotos: jest.fn(), toStrava: jest.fn() };
}

async function save() {
  await fireEvent.press(screen.getByRole("button", { name: "Save to My activities" }));
}

beforeEach(() => {
  mockSport = "run";
});

test("nothing chosen: «Only me», the run a run, and «Save» sends no drawing", async () => {
  const door = spies();
  await render(<WithDoor door={door} />);
  expect(screen.getByRole("radio", { name: "Only me", checked: true })).toBeTruthy();
  expect(screen.getByRole("radio", { name: "Run", checked: true })).toBeTruthy();
  await save();
  expect(door.toDrawing).toHaveBeenCalledWith(null);
  expect(door.toPhotos).toHaveBeenCalledWith([]);
  expect(door.toStrava).toHaveBeenCalledWith(null);
});

test("the sport of «Settings» is the activity, and counts as chosen", async () => {
  mockSport = "bike";
  const door = spies();
  await render(<WithDoor door={door} />);
  expect(screen.getByRole("radio", { name: "Bike", checked: true })).toBeTruthy();
  await save();
  expect(door.toDrawing).toHaveBeenCalledWith({ ...NOT_CHOSEN, activity: "cycling" });
});

test("the title, how it went and who can see it go whole with «Save»", async () => {
  const door = spies();
  await render(<WithDoor door={door} />);
  await fireEvent.changeText(screen.getByLabelText("Title"), " Sunday heart ");
  await fireEvent.changeText(screen.getByLabelText("How did it go?"), "Heavy legs.");
  await fireEvent.press(screen.getByRole("radio", { name: "Followers" }));
  await fireEvent.press(screen.getByRole("radio", { name: "Paddle" }));
  await save();
  expect(door.toDrawing).toHaveBeenCalledWith({
    title: "Sunday heart",
    description: "Heavy legs.",
    activity: "paddling",
    tags: [],
    visibility: "followers",
  });
});

test("the photos chosen go with «Save», in order, and «Only me» warns they stay here", async () => {
  const door = spies();
  await render(<WithDoor door={door} />);
  expect(screen.queryByText(ONLY_ME_PHOTOS)).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Add photo" }));
  await fireEvent.press(screen.getByRole("button", { name: "Choose a picture" }));
  expect(await screen.findByLabelText("Photo 1")).toBeTruthy();
  expect(screen.getByText(ONLY_ME_PHOTOS)).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Add photo" }));
  await fireEvent.press(screen.getByRole("button", { name: "Take a photo" }));
  expect(await screen.findByLabelText("Photo 2")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Remove photo 1" }));
  expect(screen.queryByLabelText("Photo 1")).toBeNull();
  await save();
  expect(door.toPhotos).toHaveBeenCalledWith(["c2hydW5r"]);
  // Nothing else chosen: the photos are the phone's, no drawing is sent.
  expect(door.toDrawing).toHaveBeenCalledWith(null);
});
