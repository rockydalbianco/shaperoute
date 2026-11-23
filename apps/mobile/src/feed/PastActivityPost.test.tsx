import page from "@shaperoute/shared-types/fixtures/activities.json";
import myDetails from "@shaperoute/shared-types/fixtures/my-drawing-details.json";
import type { MyDrawing } from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useState } from "react";

import {
  ActivitiesContext,
  type ActivitiesDoor,
  useActivitiesDoor,
} from "../activities/activitiesDoor";
import { startedLabel } from "../activities/activityText";
import type { Activity, ActivitiesPage } from "../api/activities";
import { type DrawingChoice, NOT_CHOSEN } from "../api/drawings";
import {
  type DrawingsDoor,
  DrawingsContext,
  useDrawingsDoor,
} from "../social/drawingsDoor";
import { PastActivityPost } from "./PastActivityPost";

// «Already recorded» in the Feed's «+» (TASK-481 part F): the activities of
// «My activities» others do not see yet, the latest first; the one chosen
// opens the form of «Edit post», where «Everyone» puts it in the Feed.

jest.mock("expo-file-system");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const LIST = (page as ActivitiesPage).activities;
const [LATEST, EARLIER] = LIST;
const MINE = myDetails as MyDrawing;

function doors({
  activities = {},
  drawings = {},
}: {
  activities?: Partial<ActivitiesDoor>;
  drawings?: Partial<DrawingsDoor>;
}) {
  const refresh = jest.fn();
  const refreshMine = jest.fn();
  const choose = jest.fn(async (_key: string, choice: DrawingChoice) => ({
    kind: "saved" as const,
    drawing: { ...MINE, visibility: choice.visibility },
  }));
  const choiceOf = jest.fn(async () => ({
    kind: "known" as const,
    choice: NOT_CHOSEN,
    waiting: false,
    photos: [],
  }));
  const onDone = jest.fn();
  function Shown() {
    const noActivities = useActivitiesDoor();
    const noDrawings = useDrawingsDoor();
    const [chosen, setChosen] = useState<Activity | null>(null);
    return (
      <ActivitiesContext.Provider
        value={{
          ...noActivities,
          signedIn: true,
          status: "ready",
          list: LIST,
          total: LIST.length,
          refresh,
          ...activities,
        }}
      >
        <DrawingsContext.Provider
          value={{ ...noDrawings, refreshMine, choose, choiceOf, ...drawings }}
        >
          <PastActivityPost chosen={chosen} onChoose={setChosen} onDone={onDone} />
        </DrawingsContext.Provider>
      </ActivitiesContext.Provider>
    );
  }
  return { Shown, refresh, refreshMine, choose, choiceOf, onDone };
}

test("lists the activities others do not see yet, the latest first, and asks the API again", async () => {
  const { Shown, refresh, refreshMine } = doors({
    drawings: { publicKeys: new Set<string>() },
  });
  await render(<Shown />);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(refreshMine).toHaveBeenCalled();
  expect(
    screen.getByText("Your activities not in the Feed yet, the latest first."),
  ).toBeTruthy();
  const rows = screen.getAllByTestId("past-activity");
  expect(rows).toHaveLength(2);
  expect(rows[0].props.accessibilityLabel).toContain(startedLabel(LATEST.started_at));
  expect(rows[1].props.accessibilityLabel).toContain(startedLabel(EARLIER.started_at));
});

test("an activity others see already is not in the list", async () => {
  const { Shown } = doors({ drawings: { publicKeys: new Set([LATEST.id]) } });
  await render(<Shown />);
  const rows = screen.getAllByTestId("past-activity");
  expect(rows).toHaveLength(1);
  expect(rows[0].props.accessibilityLabel).toContain(startedLabel(EARLIER.started_at));
});

test("with every activity in the Feed, it says so", async () => {
  const { Shown } = doors({
    drawings: { publicKeys: new Set(LIST.map((activity) => activity.id)) },
  });
  await render(<Shown />);
  expect(screen.queryByTestId("past-activity")).toBeNull();
  expect(screen.getByText("All your activities are in the Feed already.")).toBeTruthy();
});

test("with more pages, «Show more» asks for the next one", async () => {
  const loadMore = jest.fn();
  const { Shown } = doors({
    activities: { more: true, loadMore },
    drawings: { publicKeys: new Set(LIST.map((activity) => activity.id)) },
  });
  await render(<Shown />);
  expect(screen.queryByText("All your activities are in the Feed already.")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Show more" }));
  expect(loadMore).toHaveBeenCalledTimes(1);
});

test("without activities, and while they load, it says so", async () => {
  const empty = doors({ activities: { list: [], total: 0 } });
  await render(<empty.Shown />);
  expect(
    screen.getByText(
      "No activities yet. Save a run when you finish it, and it is kept here.",
    ),
  ).toBeTruthy();
  const loading = doors({ activities: { list: [], total: null, status: "loading" } });
  await render(<loading.Shown />);
  expect(screen.getByText("Loading your activities…")).toBeTruthy();
});

test("when the list could not load, «Try again» asks again", async () => {
  const { Shown, refresh } = doors({ activities: { list: [], status: "failed" } });
  await render(<Shown />);
  expect(screen.getByText("Your activities could not load.")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
  expect(refresh).toHaveBeenCalledTimes(2);
});

test("the activity chosen opens the form of «Edit post»; «Everyone» makes it a post; «Done» closes", async () => {
  const { Shown, choose, choiceOf, onDone } = doors({
    drawings: { publicKeys: new Set<string>() },
  });
  await render(<Shown />);
  await fireEvent.press(screen.getAllByTestId("past-activity")[0]);
  expect(screen.getByTestId("past-activity-form")).toBeTruthy();
  expect(
    screen.getByText("Choose «Everyone» or «Followers» and it goes in the Feed."),
  ).toBeTruthy();
  await waitFor(() => expect(choiceOf).toHaveBeenCalledWith(LATEST.id));
  await fireEvent.press(await screen.findByText("Everyone"));
  await waitFor(() =>
    expect(choose).toHaveBeenCalledWith(
      LATEST.id,
      expect.objectContaining({ visibility: "everyone" }),
    ),
  );
  await fireEvent.press(screen.getByRole("button", { name: "Done" }));
  expect(onDone).toHaveBeenCalledTimes(1);
});
