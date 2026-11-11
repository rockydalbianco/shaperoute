import skiSeason from "@shaperoute/shared-types/fixtures/ski-season.json";
import type { SkiSeason as Season } from "@shaperoute/shared-types";
import { act, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import {
  DrawingsContext,
  type DrawingsDoor,
  useDrawingsDoor,
} from "../social/drawingsDoor";
import { saveUnitsChoice } from "../units/units";
import { SkiSeason } from "./SkiSeason";

// The season at the top of «Days» (TASK-429 part C): asked for the season
// of today, its sums shown, nothing without a day or an answer.

const TODAY = new Date(2026, 11, 14);

function DoorWith({
  children,
  skiSeasonOf,
}: {
  children: ReactNode;
  skiSeasonOf: DrawingsDoor["skiSeasonOf"];
}) {
  const door = useDrawingsDoor();
  return (
    <DrawingsContext.Provider value={{ ...door, skiSeasonOf }}>
      {children}
    </DrawingsContext.Provider>
  );
}

async function shown(answer: Season | null) {
  const skiSeasonOf = jest.fn(async () => answer);
  await render(
    <DoorWith skiSeasonOf={skiSeasonOf}>
      <SkiSeason today={TODAY} />
    </DoorWith>,
  );
  await act(async () => {});
  return skiSeasonOf;
}

beforeEach(() => saveUnitsChoice("km"));

test("asks for the season of today and shows its sums", async () => {
  const asked = await shown(skiSeason);
  expect(asked).toHaveBeenCalledWith("2026-07-01", "2027-06-30");
  expect(screen.getByRole("header", { name: "Season 2026/27" })).toBeOnTheScreen();
  expect(screen.getByText("m · Vertical this season")).toBeOnTheScreen();
  expect(screen.getByLabelText("Days: 6")).toBeOnTheScreen();
  expect(screen.getByLabelText("Distance: 142 km")).toBeOnTheScreen();
  expect(screen.getByLabelText("Descents: 64")).toBeOnTheScreen();
  expect(screen.getByLabelText("Lifts: 96")).toBeOnTheScreen();
  expect(screen.getByLabelText("Top speed: 81.0 km/h")).toBeOnTheScreen();
  expect(screen.getByLabelText("On snow: 31 h 00 min")).toBeOnTheScreen();
});

test("nothing in a season without a day, or without an answer", async () => {
  await shown({ ...skiSeason, days: 0 });
  expect(screen.queryByTestId("ski-season")).toBeNull();
  await shown(null);
  expect(screen.queryByTestId("ski-season")).toBeNull();
});
