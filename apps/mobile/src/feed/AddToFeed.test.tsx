import { readFileSync } from "fs";
import { join } from "path";

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import {
  ActivitiesContext,
  type ActivitiesDoor,
  useActivitiesDoor,
} from "../activities/activitiesDoor";
import type { PickFile, Picked } from "../imports/pickActivityFile";
import { AddToFeed } from "./AddToFeed";

// The Feed's «+» (TASK-476): a sheet «Add activity» with «From a file»,
// the flow of «Add past activity» (TASK-312) without its own button; the
// sheet closes once the run is kept or the form discarded.

jest.mock("expo-file-system");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("../settings/useSport", () => ({ useSport: () => "run" }));

const FOLDER = join(__dirname, "../../__tests__/fixtures/imports");

function file(name: string): Picked {
  return { kind: "picked", bytes: new Uint8Array(readFileSync(join(FOLDER, name))) };
}

function spies() {
  return {
    toDrawing: jest.fn(),
    toPhotos: jest.fn(),
    toStrava: jest.fn(),
    recordImported: jest.fn(() => true),
    alreadyKept: jest.fn(async () => false),
  };
}

async function show(door: Partial<ActivitiesDoor>, available = true) {
  const pickFile: PickFile = jest.fn(async () => file("strava-run.gpx"));
  function WithDoor() {
    const nothing = useActivitiesDoor();
    return (
      <ActivitiesContext.Provider value={{ ...nothing, signedIn: true, ...door }}>
        <AddToFeed available={available} pickFile={pickFile} />
      </ActivitiesContext.Provider>
    );
  }
  await render(<WithDoor />);
  return pickFile;
}

async function openSheet() {
  await fireEvent.press(screen.getByRole("button", { name: "Add activity" }));
}

test("without the file picker in the app there is no «+»", async () => {
  await show(spies(), false);
  expect(screen.queryByTestId("feed-add")).toBeNull();
});

test("the «+» opens «Add activity» with «From a file» at once", async () => {
  await show(spies());
  expect(screen.queryByText("From a file")).toBeNull();
  await openSheet();
  expect(screen.getByRole("header", { name: "Add activity" })).toBeTruthy();
  expect(screen.getByText("From a file")).toBeTruthy();
  expect(screen.getByText("GPX, TCX or FIT from Strava, Garmin, Komoot…")).toBeTruthy();
  // No second button of its own: the sheet is the opener.
  expect(screen.queryByText("Add past activity")).toBeNull();
});

test("«Close» closes the sheet", async () => {
  await show(spies());
  await openSheet();
  await fireEvent.press(screen.getByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.queryByText("From a file")).toBeNull());
});

test("a file becomes the form, and «Save» keeps it and closes the sheet", async () => {
  const door = spies();
  const pickFile = await show(door);
  await openSheet();
  await fireEvent.press(screen.getByText("From a file"));
  expect(await screen.findByTestId("imported-form")).toBeTruthy();
  expect(pickFile).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole("button", { name: "Save to My activities" }));
  expect(door.recordImported).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(screen.queryByTestId("imported-form")).toBeNull());
  await waitFor(() => expect(screen.queryByText("From a file")).toBeNull());
});

test("from the «+» the form starts on «Everyone», said over «Save»", async () => {
  const door = spies();
  await show(door);
  await openSheet();
  await fireEvent.press(screen.getByText("From a file"));
  await screen.findByTestId("imported-form");
  expect(screen.getByRole("radio", { name: "Everyone", checked: true })).toBeTruthy();
  // Under «Who can see it», and again over «Save».
  expect(screen.getAllByText("Every member sees it in your profile.")).toHaveLength(2);
  await fireEvent.press(screen.getByRole("button", { name: "Save to My activities" }));
  expect(door.toDrawing).toHaveBeenCalledWith(
    expect.objectContaining({ visibility: "everyone" }),
  );
});

test("«Everyone» can still be changed before «Save»", async () => {
  const door = spies();
  await show(door);
  await openSheet();
  await fireEvent.press(screen.getByText("From a file"));
  await screen.findByTestId("imported-form");
  await fireEvent.press(screen.getByRole("radio", { name: "Only me" }));
  await fireEvent.press(screen.getByRole("button", { name: "Save to My activities" }));
  // «Only me» and nothing else chosen: no drawing goes out at all.
  expect(door.toDrawing).toHaveBeenCalledWith(null);
});
