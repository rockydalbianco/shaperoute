import page from "@shaperoute/shared-types/fixtures/drawings.json";
import skiDayParts from "@shaperoute/shared-types/fixtures/ski-day-parts.json";
import type {
  Drawing,
  DrawingsPage,
  SkiDay,
  SkiDayPart,
} from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import {
  DrawingsContext,
  type DrawingsDoor,
  useDrawingsDoor,
} from "../social/drawingsDoor";
import { saveUnitsChoice } from "../units/units";
import { SkiDayPage, snowPartOf, sumsOf } from "./SkiDayPage";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// A saved day of skiing opened from «Days» (TASK-429 part C): its numbers
// from the parts, «Map» opening the post on the map, «Runs» with the names.

const day: Drawing = {
  ...((page as DrawingsPage).drawings[0] as Drawing),
  id: "d1",
  place: "Selva",
  started_at: "2026-12-14T08:30:00",
  activity: "skiing",
  distance_m: 7000,
  duration_s: 2400,
};
const parts = skiDayParts.parts as SkiDayPart[];

function DoorWith({
  children,
  skiDayOf,
  open,
}: {
  children: ReactNode;
  skiDayOf: DrawingsDoor["skiDayOf"];
  open: DrawingsDoor["open"];
}) {
  const door = useDrawingsDoor();
  return (
    <DrawingsContext.Provider value={{ ...door, skiDayOf, open }}>
      {children}
    </DrawingsContext.Provider>
  );
}

async function shown(answer: SkiDay | null, open = jest.fn(), onBack = jest.fn()) {
  await render(
    <DoorWith skiDayOf={async () => answer} open={open}>
      <SkiDayPage day={day} onBack={onBack} />
    </DoorWith>,
  );
  await act(async () => {});
  return { open, onBack };
}

beforeEach(() => saveUnitsChoice("km"));

test("a saved part is read as «Runs» reads one, on the clock of the day", () => {
  const lift = snowPartOf(parts[0], day.started_at);
  expect(lift.leg).toEqual({ from: 0, to: 20 });
  expect(lift.startMs).toBe(Date.parse(day.started_at));
  expect(lift.endMs).toBe(Date.parse(day.started_at) + 600_000);
  expect(lift.ms).toBe(600_000);
  expect(sumsOf(parts)).toEqual({
    skiedM: 3900,
    verticalM: 518.5,
    descents: 2,
    lifts: 1,
    topMps: 19.4,
  });
});

test("«Summary» has the numbers of the parts", async () => {
  await shown(skiDayParts as unknown as SkiDay);
  expect(
    screen.getByRole("header", { name: "Mon 14 Dec 2026 · Selva" }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("tab", { name: "Summary" })).toBeSelected();
  expect(screen.getByLabelText("Skied: 3.90 km")).toBeOnTheScreen();
  expect(screen.getByLabelText("Descents: 2")).toBeOnTheScreen();
  expect(screen.getByLabelText("Lifts: 1")).toBeOnTheScreen();
  expect(screen.getByLabelText("Top speed: 69.8 km/h")).toBeOnTheScreen();
});

test("«Runs» has each part with its name", async () => {
  await shown(skiDayParts as unknown as SkiDay);
  await fireEvent.press(screen.getByRole("tab", { name: "Runs" }));
  expect(screen.getByText("Ciampinoi")).toBeOnTheScreen();
  expect(screen.getByText("Saslong")).toBeOnTheScreen();
  expect(screen.getByText("Piste without a name")).toBeOnTheScreen();
});

test("«Map» opens the day on the map, as its post", async () => {
  const { open } = await shown(skiDayParts as unknown as SkiDay);
  await fireEvent.press(screen.getByRole("tab", { name: "Map" }));
  expect(open).toHaveBeenCalledWith(day);
  expect(screen.getByRole("tab", { name: "Summary" })).toBeSelected();
});

test("a day saved before the parts has its kilometres and its time", async () => {
  await shown({ resort: null, gear: null, snow: null });
  expect(screen.getByLabelText("Distance: 7.00 km")).toBeOnTheScreen();
  expect(screen.getByLabelText("Time: 40 min")).toBeOnTheScreen();
  expect(screen.queryByLabelText(/^Descents/)).toBeNull();
});

test("«Back» leaves", async () => {
  const { onBack } = await shown(null);
  await fireEvent.press(screen.getByTestId("ski-day-back"));
  expect(onBack).toHaveBeenCalledTimes(1);
});
