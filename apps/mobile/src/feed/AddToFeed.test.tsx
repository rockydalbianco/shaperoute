import page from "@shaperoute/shared-types/fixtures/activities.json";
import { readFileSync } from "fs";
import { join } from "path";

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import {
  ActivitiesContext,
  type ActivitiesDoor,
  useActivitiesDoor,
} from "../activities/activitiesDoor";
import { startedLabel } from "../activities/activityText";
import type { ActivitiesPage } from "../api/activities";
import type { PickFile, Picked } from "../imports/pickActivityFile";
import { AddToFeed } from "./AddToFeed";
import { ADD_TO_FEED_ICONS } from "./addToFeedEntries";

// The Feed's «+» (TASK-476, TASK-481): a sheet «Add to Feed» that opens on
// the list of its ready entries, in the user's order; a chosen entry opens
// in the same sheet, «‹» goes back to the list, and the sheet closes once
// the run or the post is kept, or the form discarded.

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

async function show(
  door: Partial<ActivitiesDoor>,
  available = true,
  onRecord?: () => void,
  picked: Awaited<ReturnType<PickFile>> = file("strava-run.gpx"),
) {
  const pickFile: PickFile = jest.fn(async () => picked);
  function WithDoor() {
    const nothing = useActivitiesDoor();
    return (
      <ActivitiesContext.Provider value={{ ...nothing, signedIn: true, ...door }}>
        <AddToFeed available={available} pickFile={pickFile} onRecord={onRecord} />
      </ActivitiesContext.Provider>
    );
  }
  await render(<WithDoor />);
  return pickFile;
}

async function openSheet() {
  await fireEvent.press(screen.getByRole("button", { name: "Add to Feed" }));
}

async function chooseFile() {
  await openSheet();
  await fireEvent.press(screen.getByText("From a file"));
}

test("the «+» opens «Add to Feed» on the list, in the user's order", async () => {
  await show(spies(), true, jest.fn());
  expect(screen.queryByText("From a file")).toBeNull();
  await openSheet();
  expect(screen.getByRole("header", { name: "Add to Feed" })).toBeTruthy();
  const titles = [
    "Record now",
    "Already recorded",
    "Photos only",
    "From a file",
    "Gym workout",
    "Workout plan",
  ];
  const rows = titles.map((title) => screen.getByText(title));
  expect(rows).toHaveLength(6);
  expect(screen.getByText("Start an activity now")).toBeTruthy();
  expect(screen.getByText("Post an activity from My activities")).toBeTruthy();
  expect(screen.getByText("Up to 10 photos, also from Instagram")).toBeTruthy();
  expect(
    screen.getByText("GPX, TCX, FIT or IGC from Strava, Garmin, Komoot…"),
  ).toBeTruthy();
  expect(screen.getByText("A workout you already did, written by hand")).toBeTruthy();
  expect(screen.getByText("Share one of your gym plans")).toBeTruthy();
  const ids = screen
    .getAllByTestId(/^feed-add-(record|done|photos|file|gym|plan)$/)
    .map((row) => row.props.testID);
  expect(ids).toEqual([
    "feed-add-record",
    "feed-add-done",
    "feed-add-photos",
    "feed-add-file",
    "feed-add-gym",
    "feed-add-plan",
  ]);
  // Each with its own sign beside the words (TASK-509).
  for (const id of ["record", "done", "photos", "file", "gym", "plan"] as const) {
    const icon = screen.getByTestId(`feed-add-icon-${id}`);
    expect(icon.props.source).toBe(ADD_TO_FEED_ICONS[id]);
  }
  // The list is the opener: no form, no «Back», nothing picked yet.
  expect(screen.queryByTestId("imported-form")).toBeNull();
  expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
});

test("without the file picker in the app there is no «From a file»", async () => {
  await show(spies(), false, jest.fn());
  await openSheet();
  expect(screen.queryByText("From a file")).toBeNull();
  expect(screen.getByText("Record now")).toBeTruthy();
  expect(screen.getByText("Photos only")).toBeTruthy();
});

test("without a way to record there is no «Record now»", async () => {
  await show(spies());
  await openSheet();
  expect(screen.queryByText("Record now")).toBeNull();
  expect(screen.getByText("Photos only")).toBeTruthy();
});

test("«Record now» closes the sheet and starts a recording", async () => {
  const onRecord = jest.fn();
  await show(spies(), true, onRecord);
  await openSheet();
  await fireEvent.press(screen.getByText("Record now"));
  expect(onRecord).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(screen.queryByText("Photos only")).toBeNull());
});

test("«Photos only» opens its form in the sheet; «‹» and «Cancel» go back to the list", async () => {
  await show(spies());
  await openSheet();
  await fireEvent.press(screen.getByText("Photos only"));
  expect(screen.getByTestId("photo-post-form")).toBeTruthy();
  expect(screen.getByRole("header", { name: "Photos only" })).toBeTruthy();
  expect(screen.queryByText("From a file")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(screen.queryByTestId("photo-post-form")).toBeNull();
  expect(screen.getByRole("header", { name: "Add to Feed" })).toBeTruthy();
  await fireEvent.press(screen.getByText("Photos only"));
  await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByTestId("photo-post-form")).toBeNull();
  expect(screen.getByText("From a file")).toBeTruthy();
});

test("«Workout plan» opens «Choose a plan» in the sheet; «‹» goes back to the list", async () => {
  await show(spies());
  await openSheet();
  await fireEvent.press(screen.getByText("Workout plan"));
  expect(screen.getByRole("header", { name: "Workout plan" })).toBeTruthy();
  expect(screen.getByTestId("plan-post-choose")).toBeTruthy();
  expect(screen.getByText("Choose a plan")).toBeTruthy();
  // No plans on this phone: the way to make one.
  expect(screen.getByText("No plans yet: make one in Gym › Plans.")).toBeTruthy();
  expect(screen.queryByText("Photos only")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(screen.queryByTestId("plan-post-choose")).toBeNull();
  expect(screen.getByText("Photos only")).toBeTruthy();
});

test("«Gym workout» opens the workout written by hand under the sheet's title; «‹» goes back", async () => {
  await show(spies());
  await openSheet();
  await fireEvent.press(screen.getByText("Gym workout"));
  expect(screen.getByRole("header", { name: "Gym workout" })).toBeTruthy();
  expect(screen.getByTestId("gym-by-hand")).toBeTruthy();
  // One title only: the sheet's.
  expect(screen.getAllByText("Gym workout")).toHaveLength(1);
  expect(screen.getByTestId("by-hand-save")).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(screen.queryByTestId("gym-by-hand")).toBeNull();
  expect(screen.getByText("Photos only")).toBeTruthy();
});

test("«From a file» opens «Files» at once", async () => {
  const pickFile = await show(spies());
  await chooseFile();
  expect(await screen.findByTestId("imported-form")).toBeTruthy();
  expect(pickFile).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("header", { name: "From a file" })).toBeTruthy();
});

test("a file canceled leaves «From a file» alone to pick again, no «Photos only»", async () => {
  const pickFile = await show(spies(), true, undefined, { kind: "canceled" });
  await chooseFile();
  await waitFor(() => expect(pickFile).toHaveBeenCalledTimes(1));
  // The header and the choice again, with its help.
  expect(await screen.findAllByText("From a file")).toHaveLength(2);
  expect(screen.queryByText("Photos only")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByText("Photos only")).toBeTruthy();
});

test("«Close» closes the sheet, and it opens again on the list", async () => {
  await show(spies());
  await openSheet();
  await fireEvent.press(screen.getByText("Photos only"));
  await fireEvent.press(screen.getByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.queryByTestId("photo-post-form")).toBeNull());
  await openSheet();
  expect(screen.getByRole("header", { name: "Add to Feed" })).toBeTruthy();
  expect(screen.getByText("From a file")).toBeTruthy();
});

test("a file becomes the form, and «Save» keeps it and closes the sheet", async () => {
  const door = spies();
  await show(door);
  await chooseFile();
  expect(await screen.findByTestId("imported-form")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Save to My activities" }));
  expect(door.recordImported).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(screen.queryByTestId("imported-form")).toBeNull());
  await waitFor(() => expect(screen.queryByText("Photos only")).toBeNull());
});

test("from the «+» the form starts on «Everyone», said over «Save»", async () => {
  const door = spies();
  await show(door);
  await chooseFile();
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
  await chooseFile();
  await screen.findByTestId("imported-form");
  await fireEvent.press(screen.getByRole("radio", { name: "Only me" }));
  await fireEvent.press(screen.getByRole("button", { name: "Save to My activities" }));
  // «Only me» and nothing else chosen: no drawing goes out at all.
  expect(door.toDrawing).toHaveBeenCalledWith(null);
});

// «Already recorded» (TASK-481 part F): the activities not in the Feed yet,
// then the form of «Edit post» of the one chosen.

const ACTIVITIES = (page as ActivitiesPage).activities;

async function showDone(onActivityPosted = jest.fn()) {
  function WithDoor() {
    const nothing = useActivitiesDoor();
    return (
      <ActivitiesContext.Provider
        value={{
          ...nothing,
          signedIn: true,
          status: "ready",
          list: ACTIVITIES,
          total: ACTIVITIES.length,
        }}
      >
        <AddToFeed available onActivityPosted={onActivityPosted} />
      </ActivitiesContext.Provider>
    );
  }
  await render(<WithDoor />);
  return onActivityPosted;
}

test("«Already recorded» lists the activities; one chosen opens its form; «‹» goes back to the list, then to the entries", async () => {
  await showDone();
  await openSheet();
  await fireEvent.press(screen.getByText("Already recorded"));
  expect(screen.getByRole("header", { name: "Already recorded" })).toBeTruthy();
  expect(screen.getByTestId("past-activity-list")).toBeTruthy();
  expect(screen.queryByText("Photos only")).toBeNull();
  await fireEvent.press(
    screen.getByRole("button", {
      name: new RegExp(`^${startedLabel(ACTIVITIES[0].started_at)}`),
    }),
  );
  expect(screen.getByTestId("past-activity-form")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(screen.queryByTestId("past-activity-form")).toBeNull();
  expect(screen.getByTestId("past-activity-list")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByRole("header", { name: "Add to Feed" })).toBeTruthy();
  expect(screen.getByText("Photos only")).toBeTruthy();
});

test("the Feed reads again when the sheet closes after an activity was opened, not before", async () => {
  const onActivityPosted = await showDone();
  await openSheet();
  await fireEvent.press(screen.getByText("Already recorded"));
  await fireEvent.press(screen.getByRole("button", { name: "Close" }));
  expect(onActivityPosted).not.toHaveBeenCalled();
  await openSheet();
  await fireEvent.press(screen.getByText("Already recorded"));
  await fireEvent.press(screen.getAllByTestId("past-activity")[0]);
  await fireEvent.press(screen.getByRole("button", { name: "Done" }));
  expect(onActivityPosted).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(screen.queryByTestId("past-activity-form")).toBeNull());
});
