import { fireEvent, render, screen } from "@testing-library/react-native";

import { OutingToday } from "./PlanTodayCard";
import type { TodayWorkout } from "./plans";

// TASK-461 B and C (ADR-0371), rows F and G of the canvas: «Oggi: lungo ·
// 45 km», beyond what «Draw» draws «Registra libero» first; a climb day
// asks for at least its metres of climb.

const LONG: TodayWorkout = {
  key: "pl00000000000005",
  plan: "Toward 60 km by bike",
  name: "Long ride · 45 km",
  items: [],
  week: 7,
  weeks: 10,
  outing: { sport: "bike", kind: "long", distance_m: 45_000 },
  target: { sport: "bike", distance_m: 60_000 },
};

test("a long ride beyond what «Draw» draws: record freely first", async () => {
  const onRecord = jest.fn();
  await render(<OutingToday today={LONG} onRecord={onRecord} />);
  expect(screen.getByText("Today: Long ride · 45 km")).toBeOnTheScreen();
  expect(screen.getByText("Toward 60 km, week 7 of 10.")).toBeOnTheScreen();
  expect(screen.getByText("Draw draws 30 km at most")).toBeOnTheScreen();
  expect(screen.getByTestId("plan-today-record")).toHaveTextContent(
    "Record freely · 45 km",
  );
  expect(screen.getByTestId("plan-today-draw")).toHaveTextContent("Draw 30 km");
  expect(
    screen.getByText("A ride today marks the day done, even a shorter one."),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("plan-today-record"));
  expect(onRecord).toHaveBeenCalled();
});

test("a climb day: at least its climb, the hike drawn with its km", async () => {
  await render(
    <OutingToday
      today={{
        ...LONG,
        plan: "Toward 1000 m",
        week: 5,
        outing: { sport: "hike", kind: "climb", climb_m: 600, distance_m: 12_000 },
        target: { sport: "hike", climb_m: 1000 },
      }}
      onRecord={jest.fn()}
    />,
  );
  expect(screen.getByText("Today: Climb outing · 600 m")).toBeOnTheScreen();
  expect(screen.getByText("Toward 1000 m, week 5 of 10.")).toBeOnTheScreen();
  expect(screen.getByText("Look for at least 600 m of climb")).toBeOnTheScreen();
  expect(screen.getByTestId("plan-today-draw")).toHaveTextContent(
    "Draw the hike · 12 km",
  );
  expect(screen.getByTestId("plan-today-record")).toHaveTextContent(
    "Record freely · 600 m",
  );
});

test("in the gym's page, one button to the day's sport", async () => {
  await render(
    <OutingToday
      today={{ ...LONG, outing: { sport: "bike", kind: "easy", distance_m: 20_000 } }}
    />,
  );
  expect(screen.getByTestId("plan-today-go")).toHaveTextContent(
    "Go to the day · 20 km",
  );
  expect(screen.queryByTestId("plan-today-record")).toBeNull();
});
