import activities from "@shaperoute/shared-types/fixtures/activities.json";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { ActivitiesList } from "../activities/ActivitiesList";
import {
  ActivitiesContext,
  type ActivitiesDoor,
  useActivitiesDoor,
} from "../activities/activitiesDoor";
import type { Activity, ActivitiesPage } from "../api/activities";
import { isPoolSwimRun } from "./PoolTile";

// TASK-400 part B: a swim in a pool in «My activities», as the API lists it
// to an app that says `pool`: no line, no place. Its row shows the 🏊 tile,
// «Pool swim», its metres, time, pace /100 m and calories (TASK-409 A),
// and does not open a map it has not got.

jest.mock("expo-file-system");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const RUN = (activities as ActivitiesPage).activities[0];
const POOL: Activity = {
  ...RUN,
  id: "poolkey12345",
  activity: "swimming",
  place: null,
  route_preview: null,
  track_preview: [],
  distance_m: 1500,
  duration_s: 2400,
};

async function list(rows: Activity[], open = jest.fn()) {
  function WithDoor() {
    const nothing = useActivitiesDoor();
    const door: ActivitiesDoor = {
      ...nothing,
      signedIn: true,
      status: "ready",
      list: rows,
      open,
    };
    return (
      <ActivitiesContext.Provider value={door}>
        <ActivitiesList />
      </ActivitiesContext.Provider>
    );
  }
  await render(<WithDoor />);
  return open;
}

test("a swim without a track and without a route is a swim in a pool", () => {
  expect(isPoolSwimRun(POOL)).toBe(true);
  expect(isPoolSwimRun(RUN)).toBe(false);
  expect(isPoolSwimRun({ ...POOL, activity: "running" })).toBe(false);
  expect(isPoolSwimRun({ ...POOL, track_preview: RUN.track_preview })).toBe(false);
});

test("its row: the tile, «Pool swim», metres, time and pace, nothing to open", async () => {
  const open = await list([POOL]);
  // Hidden from a screen reader, which hears the row's words.
  expect(
    screen.getByTestId("pool-tile", { includeHiddenElements: true }),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText(/Pool swim, 1\.50 km/)).toBeOnTheScreen();
  expect(screen.getByText("Pool swim")).toBeOnTheScreen();
  expect(
    screen.getByText("1.50 km · 40:00 · 2:40 /100 m · 235 kcal"),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByText("Pool swim"));
  expect(open).not.toHaveBeenCalled();
});

test("a run's row is as before, and opens", async () => {
  const open = await list([RUN]);
  expect(screen.queryByTestId("pool-tile", { includeHiddenElements: true })).toBeNull();
  await fireEvent.press(screen.getByLabelText(/open on the map$/));
  expect(open).toHaveBeenCalled();
});
